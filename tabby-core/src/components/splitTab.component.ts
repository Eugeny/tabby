import { Observable, Subject } from 'rxjs'
import { Component, Injectable, ViewChild, ViewContainerRef, EmbeddedViewRef, AfterViewInit, OnDestroy } from '@angular/core'
import { BaseTabComponent, BaseTabProcess } from './baseTab.component'
import { TabRecoveryProvider, RecoveryToken } from '../api/tabRecovery'
import { TabsService, NewTabParameters } from '../services/tabs.service'
import { HotkeysService } from '../services/hotkeys.service'
import { TabRecoveryService } from '../services/tabRecovery.service'

export type SplitOrientation = 'v' | 'h' // eslint-disable-line @typescript-eslint/no-type-alias
export type SplitDirection = 'r' | 't' | 'b' | 'l' // eslint-disable-line @typescript-eslint/no-type-alias

/**
 * Describes a horizontal or vertical split row or column
 */
export class SplitContainer {
    orientation: SplitOrientation = 'h'

    /**
     * Children could be tabs or other containers
     */
    children: (BaseTabComponent | SplitContainer)[] = []

    /**
     * Relative sizes of children, between 0 and 1. Total sum is 1
     */
    ratios: number[] = []

    x: number
    y: number
    w: number
    h: number

    /**
     * @return Flat list of all tabs inside this container
     */
    getAllTabs (): BaseTabComponent[] {
        let r: BaseTabComponent[] = []
        for (const child of this.children) {
            if (child instanceof SplitContainer) {
                r = r.concat(child.getAllTabs())
            } else {
                r.push(child)
            }
        }
        return r
    }

    /**
     * Remove unnecessarily nested child containers and renormalizes [[ratios]]
     */
    normalize (): void {
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i]

            if (child instanceof SplitContainer) {
                child.normalize()

                if (child.children.length === 0) {
                    this.children.splice(i, 1)
                    this.ratios.splice(i, 1)
                    i--
                    continue
                } else if (child.children.length === 1) {
                    this.children[i] = child.children[0]
                } else if (child.orientation === this.orientation) {
                    const ratio = this.ratios[i]
                    this.children.splice(i, 1)
                    this.ratios.splice(i, 1)
                    for (let j = 0; j < child.children.length; j++) {
                        this.children.splice(i, 0, child.children[j])
                        this.ratios.splice(i, 0, child.ratios[j] * ratio)
                        i++
                    }
                }
            }
        }

        let s = 0
        for (const x of this.ratios) {
            s += x
        }
        this.ratios = this.ratios.map(x => x / s)
    }

    /**
     * Gets the left/top side offset for the given element index (between 0 and 1)
     */
    getOffsetRatio (index: number): number {
        let s = 0
        for (let i = 0; i < index; i++) {
            s += this.ratios[i]
        }
        return s
    }

    async serialize (): Promise<RecoveryToken> {
        const children: any[] = []
        for (const child of this.children) {
            if (child instanceof SplitContainer) {
                children.push(await child.serialize())
            } else {
                children.push(await child.getRecoveryToken())
            }
        }
        return {
            type: 'app:split-tab',
            ratios: this.ratios,
            orientation: this.orientation,
            children,
        }
    }
}

/**
 * Represents a spanner (draggable border between two split areas)
 */
export interface SplitSpannerInfo {
    container: SplitContainer

    /**
     * Number of the right/bottom split in the container
     */
    index: number
}

/**
 * Represents a tab drop zone
 */
export interface SplitDropZoneInfo {
    relativeToTab: BaseTabComponent
    side: SplitDirection
}

/**
 * Split tab is a tab that contains other tabs and allows further splitting them
 * You'll mainly encounter it inside [[AppService]].tabs
 */
@Component({
    selector: 'split-tab',
    template: `
        <ng-container #vc></ng-container>
        <split-tab-spanner
            *ngFor='let spanner of _spanners'
            [container]='spanner.container'
            [index]='spanner.index'
            (change)='onSpannerAdjusted(spanner)'
        ></split-tab-spanner>
        <split-tab-drop-zone
            *ngFor='let dropZone of _dropZones'
            [parent]='this'
            [dropZone]='dropZone'
            (tabDropped)='onTabDropped($event, dropZone)'
        >
        </split-tab-drop-zone>
    `,
    styles: [require('./splitTab.component.scss')],
})
export class SplitTabComponent extends BaseTabComponent implements AfterViewInit, OnDestroy {
    static DIRECTIONS: SplitDirection[] = ['t', 'r', 'b', 'l']

    /** @hidden */
    @ViewChild('vc', { read: ViewContainerRef }) viewContainer: ViewContainerRef

    /**
     * Top-level split container
     */
    root: SplitContainer

    /** @hidden */
    _recoveredState: any

    /** @hidden */
    _spanners: SplitSpannerInfo[] = []

    /** @hidden */
    _dropZones: SplitDropZoneInfo[] = []

    /** @hidden */
    _allFocusMode = false

    /** @hidden */
    private focusedTab: BaseTabComponent|null = null
    private maximizedTab: BaseTabComponent|null = null
    private viewRefs: Map<BaseTabComponent, EmbeddedViewRef<any>> = new Map()

    private tabAdded = new Subject<BaseTabComponent>()
    private tabAdopted = new Subject<BaseTabComponent>()
    private tabRemoved = new Subject<BaseTabComponent>()
    private splitAdjusted = new Subject<SplitSpannerInfo>()
    private focusChanged = new Subject<BaseTabComponent>()
    private initialized = new Subject<void>()

    get tabAdded$ (): Observable<BaseTabComponent> { return this.tabAdded }

    /**
     * Fired when an existing top-level tab is dragged into this tab
     */
    get tabAdopted$ (): Observable<BaseTabComponent> { return this.tabAdopted }

    get tabRemoved$ (): Observable<BaseTabComponent> { return this.tabRemoved }

    /**
     * Fired when split ratio is changed for a given spanner
     */
    get splitAdjusted$ (): Observable<SplitSpannerInfo> { return this.splitAdjusted }

    /**
     * Fired when a different sub-tab gains focus
     */
    get focusChanged$ (): Observable<BaseTabComponent> { return this.focusChanged }

    /**
     * Fired once tab layout is created and child tabs can be added
     */
    get initialized$ (): Observable<void> { return this.initialized }

    /** @hidden */
    constructor (
        private hotkeys: HotkeysService,
        private tabsService: TabsService,
        private tabRecovery: TabRecoveryService,
    ) {
        super()
        this.root = new SplitContainer()
        this.setTitle('')

        this.focused$.subscribe(() => {
            this.getAllTabs().forEach(x => x.emitFocused())
            if (this.focusedTab) {
                this.focus(this.focusedTab)
            } else {
                this.focusAnyIn(this.root)
            }
        })
        this.blurred$.subscribe(() => this.getAllTabs().forEach(x => x.emitBlurred()))

        this.subscribeUntilDestroyed(this.hotkeys.hotkey$, hotkey => {
            if (!this.hasFocus || !this.focusedTab) {
                return
            }
            switch (hotkey) {
                case 'split-right':
                    this.splitTab(this.focusedTab, 'r')
                    break
                case 'split-bottom':
                    this.splitTab(this.focusedTab, 'b')
                    break
                case 'split-top':
                    this.splitTab(this.focusedTab, 't')
                    break
                case 'split-left':
                    this.splitTab(this.focusedTab, 'l')
                    break
                case 'pane-nav-left':
                    this.navigate('l')
                    break
                case 'pane-nav-right':
                    this.navigate('r')
                    break
                case 'pane-nav-up':
                    this.navigate('t')
                    break
                case 'pane-nav-down':
                    this.navigate('b')
                    break
                case 'pane-nav-previous':
                    this.navigateLinear(-1)
                    break
                case 'pane-nav-next':
                    this.navigateLinear(1)
                    break
                case 'pane-maximize':
                    if (this.maximizedTab) {
                        this.maximize(null)
                    } else if (this.getAllTabs().length > 1) {
                        this.maximize(this.focusedTab)
                    }
                    break
                case 'close-pane':
                    this.removeTab(this.focusedTab)
                    break
            }
        })
    }

    /** @hidden */
    async ngAfterViewInit (): Promise<void> {
        if (this._recoveredState) {
            await this.recoverContainer(this.root, this._recoveredState, this._recoveredState.duplicate)
            this.layout()
            setTimeout(() => {
                if (this.hasFocus) {
                    for (const tab of this.getAllTabs()) {
                        this.focus(tab)
                    }
                }
            }, 100)
        }
        this.initialized.next()
        this.initialized.complete()
    }

    /** @hidden */
    ngOnDestroy (): void {
        this.tabAdded.complete()
        this.tabRemoved.complete()
        super.ngOnDestroy()
    }

    /** @returns Flat list of all sub-tabs */
    getAllTabs (): BaseTabComponent[] {
        return this.root.getAllTabs()
    }

    getFocusedTab (): BaseTabComponent|null {
        return this.focusedTab
    }

    getMaximizedTab (): BaseTabComponent|null {
        return this.maximizedTab
    }

    focus (tab: BaseTabComponent): void {
        this.focusedTab = tab
        for (const x of this.getAllTabs()) {
            if (x !== tab) {
                x.emitBlurred()
            }
        }
        tab.emitFocused()
        this.focusChanged.next(tab)

        if (this.maximizedTab !== tab) {
            this.maximizedTab = null
        }
        this.layout()
    }

    maximize (tab: BaseTabComponent|null): void {
        this.maximizedTab = tab
        this.layout()
    }

    /**
     * Focuses the first available tab inside the given [[SplitContainer]]
     */
    focusAnyIn (parent?: BaseTabComponent | SplitContainer): void {
        if (!parent) {
            return
        }
        if (parent instanceof SplitContainer) {
            this.focusAnyIn(parent.children[0])
        } else {
            this.focus(parent)
        }
    }

    addTab (tab: BaseTabComponent, relative: BaseTabComponent|null, side: SplitDirection): Promise<void> {
        return this.add(tab, relative, side)
    }

    /**
     * Inserts a new `tab` to the `side` of the `relative` tab
     */
    async add (thing: BaseTabComponent|SplitContainer, relative: BaseTabComponent|null, side: SplitDirection): Promise<void> {
        if (thing instanceof SplitTabComponent) {
            const tab = thing
            thing = tab.root
            tab.root = new SplitContainer()
            for (const child of thing.getAllTabs()) {
                child.removeFromContainer()
            }
            tab.destroy()
        }

        if (thing instanceof BaseTabComponent) {
            thing.parent = this
        }

        let target = (relative ? this.getParentOf(relative) : null) ?? this.root
        let insertIndex = relative ? target.children.indexOf(relative) : -1

        if (
            target.orientation === 'v' && ['l', 'r'].includes(side) ||
            target.orientation === 'h' && ['t', 'b'].includes(side)
        ) {
            const newContainer = new SplitContainer()
            newContainer.orientation = target.orientation === 'v' ? 'h' : 'v'
            newContainer.children = relative ? [relative] : []
            newContainer.ratios = [1]
            target.children[insertIndex] = newContainer
            target = newContainer
            insertIndex = 0
        }

        if (insertIndex === -1) {
            insertIndex = 0
        } else {
            insertIndex += side === 'l' || side === 't' ? 0 : 1
        }

        for (let i = 0; i < target.children.length; i++) {
            target.ratios[i] *= target.children.length / (target.children.length + 1)
        }
        target.ratios.splice(insertIndex, 0, 1 / (target.children.length + 1))
        target.children.splice(insertIndex, 0, thing)

        this.recoveryStateChangedHint.next()

        await this.initialized$.toPromise()

        for (const tab of thing instanceof SplitContainer ? thing.getAllTabs() : [thing]) {
            this.attachTabView(tab)
            this.onAfterTabAdded(tab)
        }
    }

    removeTab (tab: BaseTabComponent): void {
        const parent = this.getParentOf(tab)
        if (!parent) {
            return
        }
        const index = parent.children.indexOf(tab)
        parent.ratios.splice(index, 1)
        parent.children.splice(index, 1)

        tab.removeFromContainer()
        tab.parent = null
        this.viewRefs.delete(tab)

        this.layout()

        this.tabRemoved.next(tab)
        if (this.root.children.length === 0) {
            this.destroy()
        } else {
            this.focusAnyIn(parent)
        }
    }

    replaceTab (tab: BaseTabComponent, newTab: BaseTabComponent): void {
        const parent = this.getParentOf(tab)
        if (!parent) {
            return
        }
        const position = parent.children.indexOf(tab)
        parent.children[position] = newTab
        tab.removeFromContainer()
        this.attachTabView(newTab)
        tab.parent = null
        newTab.parent = this
        this.recoveryStateChangedHint.next()
        this.onAfterTabAdded(newTab)
    }

    /**
     * Moves focus in the given direction
     */
    navigate (dir: SplitDirection): void {
        if (!this.focusedTab) {
            return
        }

        let rel: BaseTabComponent | SplitContainer = this.focusedTab
        let parent = this.getParentOf(rel)
        if (!parent) {
            return
        }

        const orientation = ['l', 'r'].includes(dir) ? 'h' : 'v'

        while (parent !== this.root && parent.orientation !== orientation) {
            rel = parent
            parent = this.getParentOf(rel)
            if (!parent) {
                return
            }
        }

        if (parent.orientation !== orientation) {
            return
        }

        const index = parent.children.indexOf(rel)
        if (['l', 't'].includes(dir)) {
            if (index > 0) {
                this.focusAnyIn(parent.children[index - 1])
            }
        } else {
            if (index < parent.children.length - 1) {
                this.focusAnyIn(parent.children[index + 1])
            }
        }
    }

    navigateLinear (delta: number): void {
        if (!this.focusedTab) {
            return
        }

        const relativeTo: BaseTabComponent = this.focusedTab
        const all = this.getAllTabs()
        const target = all[(all.indexOf(relativeTo) + delta + all.length) % all.length]
        this.focus(target)
    }

    async splitTab (tab: BaseTabComponent, dir: SplitDirection): Promise<BaseTabComponent|null> {
        const newTab = await this.tabsService.duplicate(tab)
        if (newTab) {
            await this.addTab(newTab, tab, dir)
        }
        return newTab
    }

    /**
     * @returns the immediate parent of `tab`
     */
    getParentOf (tab: BaseTabComponent | SplitContainer, root?: SplitContainer): SplitContainer|null {
        root = root ?? this.root
        for (const child of root.children) {
            if (child instanceof SplitContainer) {
                const r = this.getParentOf(tab, child)
                if (r) {
                    return r
                }
            }
            if (child === tab) {
                return root
            }
        }
        return null
    }

    /** @hidden */
    async canClose (): Promise<boolean> {
        return !(await Promise.all(this.getAllTabs().map(x => x.canClose()))).some(x => !x)
    }

    /** @hidden */
    async getRecoveryToken (): Promise<any> {
        return this.root.serialize()
    }

    /** @hidden */
    async getCurrentProcess (): Promise<BaseTabProcess|null> {
        return (await Promise.all(this.getAllTabs().map(x => x.getCurrentProcess()))).find(x => !!x) ?? null
    }

    /** @hidden */
    onSpannerAdjusted (spanner: SplitSpannerInfo): void {
        this.layout()
        this.splitAdjusted.next(spanner)
    }

    /** @hidden */
    onTabDropped (tab: BaseTabComponent, zone: SplitDropZoneInfo) { // eslint-disable-line @typescript-eslint/explicit-module-boundary-types
        if (tab === this) {
            return
        }

        this.add(tab, zone.relativeToTab, zone.side)
        this.tabAdopted.next(tab)
    }

    destroy (): void {
        super.destroy()
        for (const x of this.getAllTabs()) {
            x.destroy()
        }
    }

    layout (): void {
        this.root.normalize()
        this._spanners = []
        this._dropZones = []
        this.layoutInternal(this.root, 0, 0, 100, 100)
    }

    private attachTabView (tab: BaseTabComponent) {
        const ref = tab.insertIntoContainer(this.viewContainer)
        this.viewRefs.set(tab, ref)
        tab.addEventListenerUntilDestroyed(ref.rootNodes[0], 'click', () => this.focus(tab))

        tab.subscribeUntilDestroyed(tab.titleChange$, t => this.setTitle(t))
        tab.subscribeUntilDestroyed(tab.activity$, a => a ? this.displayActivity() : this.clearActivity())
        tab.subscribeUntilDestroyed(tab.progress$, p => this.setProgress(p))
        if (tab.title) {
            this.setTitle(tab.title)
        }
        tab.subscribeUntilDestroyed(tab.recoveryStateChangedHint$, () => {
            this.recoveryStateChangedHint.next()
        })
        tab.subscribeUntilDestroyed(tab.destroyed$, () => {
            this.removeTab(tab)
        })
    }

    private onAfterTabAdded (tab: BaseTabComponent) {
        setImmediate(() => {
            this.layout()
            this.tabAdded.next(tab)
            this.focus(tab)
        })
    }

    private layoutInternal (root: SplitContainer, x: number, y: number, w: number, h: number) {
        const size = root.orientation === 'v' ? h : w
        const sizes = root.ratios.map(ratio => ratio * size)

        root.x = x
        root.y = y
        root.w = w
        root.h = h

        let offset = 0
        root.children.forEach((child, i) => {
            const childX = root.orientation === 'v' ? x : x + offset
            const childY = root.orientation === 'v' ? y + offset : y
            const childW = root.orientation === 'v' ? w : sizes[i]
            const childH = root.orientation === 'v' ? sizes[i] : h
            if (child instanceof SplitContainer) {
                this.layoutInternal(child, childX, childY, childW, childH)
            } else {
                const viewRef = this.viewRefs.get(child)
                if (viewRef) {
                    const element = viewRef.rootNodes[0]
                    element.classList.toggle('child', true)
                    element.classList.toggle('maximized', child === this.maximizedTab)
                    element.classList.toggle('minimized', this.maximizedTab && child !== this.maximizedTab)
                    element.classList.toggle('focused', this._allFocusMode || child === this.focusedTab)
                    element.style.left = `${childX}%`
                    element.style.top = `${childY}%`
                    element.style.width = `${childW}%`
                    element.style.height = `${childH}%`

                    if (child === this.maximizedTab) {
                        element.style.left = '5%'
                        element.style.top = '5%'
                        element.style.width = '90%'
                        element.style.height = '90%'
                    }

                    for (const side of ['t', 'r', 'b', 'l']) {
                        this._dropZones.push({
                            relativeToTab: child,
                            side: side as SplitDirection,
                        })
                    }
                }
            }
            offset += sizes[i]

            if (i !== 0) {
                this._spanners.push({
                    container: root,
                    index: i,
                })
            }
        })
    }

    private async recoverContainer (root: SplitContainer, state: any, duplicate = false) {
        const children: (SplitContainer | BaseTabComponent)[] = []
        root.orientation = state.orientation
        root.ratios = state.ratios
        root.children = children
        for (const childState of state.children) {
            if (!childState) {
                continue
            }
            if (childState.type === 'app:split-tab') {
                const child = new SplitContainer()
                await this.recoverContainer(child, childState, duplicate)
                children.push(child)
            } else {
                const recovered = await this.tabRecovery.recoverTab(childState, duplicate)
                if (recovered) {
                    const tab = this.tabsService.create(recovered)
                    children.push(tab)
                    tab.parent = this
                    this.attachTabView(tab)
                } else {
                    state.ratios.splice(state.children.indexOf(childState), 0)
                }
            }
        }
        while (root.ratios.length < root.children.length) {
            root.ratios.push(1)
        }
        root.normalize()
    }
}

/** @hidden */
@Injectable({ providedIn: 'root' })
export class SplitTabRecoveryProvider extends TabRecoveryProvider<SplitTabComponent> {
    async applicableTo (recoveryToken: RecoveryToken): Promise<boolean> {
        return recoveryToken.type === 'app:split-tab'
    }

    async recover (recoveryToken: RecoveryToken): Promise<NewTabParameters<SplitTabComponent>> {
        return {
            type: SplitTabComponent,
            inputs: { _recoveredState: recoveryToken },
        }
    }

    duplicate (recoveryToken: RecoveryToken): RecoveryToken {
        return {
            ...recoveryToken,
            duplicate: true,
        }
    }
}
