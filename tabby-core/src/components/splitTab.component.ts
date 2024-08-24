import { Observable, Subject, takeWhile } from 'rxjs'
import { Component, Injectable, ViewChild, ViewContainerRef, EmbeddedViewRef, AfterViewInit, OnDestroy, Injector } from '@angular/core'
import { BaseTabComponent, BaseTabProcess, GetRecoveryTokenOptions } from './baseTab.component'
import { TabRecoveryProvider, RecoveryToken } from '../api/tabRecovery'
import { TabsService, NewTabParameters } from '../services/tabs.service'
import { HotkeysService } from '../services/hotkeys.service'
import { TabRecoveryService } from '../services/tabRecovery.service'

export type SplitOrientation = 'v' | 'h'
export type SplitDirection = 'r' | 't' | 'b' | 'l'
export type ResizeDirection = 'v' | 'h' | 'dv' | 'dh'

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
     * Makes all tabs have the same size
     */
    equalize (): void {
        for (const child of this.children) {
            if (child instanceof SplitContainer) {
                child.equalize()
            }
        }
        this.ratios.fill(1 / this.ratios.length)
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

    async serialize (tabsRecovery: TabRecoveryService, options?: GetRecoveryTokenOptions): Promise<RecoveryToken> {
        const children: any[] = []
        for (const child of this.children) {
            if (child instanceof SplitContainer) {
                children.push(await child.serialize(tabsRecovery, options))
            } else {
                children.push(await tabsRecovery.getFullRecoveryToken(child, options))
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
export type SplitDropZoneInfo = {
    x: number
    y: number
    w: number
    h: number
} & ({
    type: 'absolute'
    container: SplitContainer
    position: number
} | {
    type: 'relative'
    relativeTo?: BaseTabComponent|SplitContainer
    side: SplitDirection
})


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
            (resizing)='onSpannerResizing($event)'
        ></split-tab-spanner>
        <split-tab-drop-zone
            *ngFor='let dropZone of _dropZones'
            [parent]='this'
            [dropZone]='dropZone'
            (tabDropped)='onTabDropped($event, dropZone)'
        >
        </split-tab-drop-zone>
        <split-tab-pane-label
            *ngFor='let tab of getAllTabs()'
            cdkDropList
            cdkAutoDropGroup='app-tabs'
            [tab]='tab'
            [parent]='this'
        >
        </split-tab-pane-label>
    `,
    styleUrls: ['./splitTab.component.scss'],
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
    _spannerResizing = false

    /**
     * Disables display of dynamic window/tab title provided by the shell
     */
    disableDynamicTitle = false

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
        injector: Injector,
    ) {
        super(injector)
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
        this.visibility$.subscribe(visibility => this.getAllTabs().forEach(x => x.emitVisibility(visibility)))

        this.tabAdded$.subscribe(() => this.updateTitle())
        this.tabRemoved$.subscribe(() => this.updateTitle())

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
                case 'pane-nav-1':
                    this.navigateSpecific(0)
                    break
                case 'pane-nav-2':
                    this.navigateSpecific(1)
                    break
                case 'pane-nav-3':
                    this.navigateSpecific(2)
                    break
                case 'pane-nav-4':
                    this.navigateSpecific(3)
                    break
                case 'pane-nav-5':
                    this.navigateSpecific(4)
                    break
                case 'pane-nav-6':
                    this.navigateSpecific(5)
                    break
                case 'pane-nav-7':
                    this.navigateSpecific(6)
                    break
                case 'pane-nav-8':
                    this.navigateSpecific(7)
                    break
                case 'pane-nav-9':
                    this.navigateSpecific(8)
                    break
                case 'pane-maximize':
                    if (this.maximizedTab) {
                        this.maximize(null)
                    } else if (this.getAllTabs().length > 1) {
                        this.maximize(this.focusedTab)
                    }
                    break
                case 'close-pane':
                    this.focusedTab.destroy()
                    break
                case 'pane-increase-vertical':
                    this.resizePane('v')
                    break
                case 'pane-decrease-vertical':
                    this.resizePane('dv')
                    break
                case 'pane-increase-horizontal':
                    this.resizePane('h')
                    break
                case 'pane-decrease-horizontal':
                    this.resizePane('dh')
                    break
            }
        })
    }

    /** @hidden */
    async ngAfterViewInit (): Promise<void> {
        if (this._recoveredState) {
            await this.recoverContainer(this.root, this._recoveredState)
            this.updateTitle()
            this.layout()
            setTimeout(() => {
                if (this.hasFocus) {
                    for (const tab of this.getAllTabs()) {
                        this.focus(tab)
                    }
                }
            }, 100)

            // Propagate visibility to new children
            this.emitVisibility(this.visibility.value)
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
    async add (thing: BaseTabComponent|SplitContainer, relative: BaseTabComponent|SplitContainer|null, side: SplitDirection): Promise<void> {
        if (thing instanceof SplitTabComponent) {
            const tab = thing
            thing = tab.root
            tab.root = new SplitContainer()
            for (const child of thing.getAllTabs()) {
                child.removeFromContainer()
            }
            tab.destroy()
        }

        let allTabs: BaseTabComponent[] = []
        if (thing instanceof BaseTabComponent) {
            allTabs = [thing]
        } else if (thing instanceof SplitContainer) {
            allTabs = thing.getAllTabs()
        }
        for (const tab of allTabs) {
            if (tab.parent instanceof SplitTabComponent) {
                tab.parent.removeTab(tab)
            }
            tab.removeFromContainer()
            tab.parent = this

            tab.emitVisibility(this.visibility.value)
        }

        let target = relative ? this.getParentOf(relative) : null
        if (!target) {
            // Rewrap the root container just in case the orientation isn't compatible
            target = new SplitContainer()
            target.orientation = ['l', 'r'].includes(side) ? 'h' : 'v'
            target.children = [this.root]
            target.ratios = [1]
            this.root = target
        }

        let insertIndex = relative
            ? target.children.indexOf(relative) + ('tl'.includes(side) ? 0 : 1)
            : 'tl'.includes(side) ? 0 : -1

        if (
            target.orientation === 'v' && ['l', 'r'].includes(side) ||
            target.orientation === 'h' && ['t', 'b'].includes(side)
        ) {
            // Inserting into a container but the orientation isn't compatible
            const newContainer = new SplitContainer()
            newContainer.orientation = ['l', 'r'].includes(side) ? 'h' : 'v'
            newContainer.children = relative ? [relative] : []
            newContainer.ratios = [1]
            target.children.splice(relative ? target.children.indexOf(relative) : -1, 1, newContainer)
            target = newContainer
            insertIndex = 'tl'.includes(side) ? 0 : 1
        }

        for (let i = 0; i < target.children.length; i++) {
            target.ratios[i] *= target.children.length / (target.children.length + 1)
        }
        if (insertIndex === -1) {
            insertIndex = target.ratios.length
        }
        target.ratios.splice(insertIndex, 0, 1 / (target.children.length + 1))
        target.children.splice(insertIndex, 0, thing)

        this.recoveryStateChangedHint.next()

        await this.initialized$.toPromise()

        for (const tab of thing instanceof SplitContainer ? thing.getAllTabs() : [thing]) {
            this.attachTabView(tab)
            this.onAfterTabAdded(tab)
        }

        this.root.normalize()
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
        this.updateTitle()
    }

    /**
      * Changes the size of the focused pane in the given direction
      */
    resizePane (direction: ResizeDirection): void {
        const resizeStep = this.config.store.terminal.paneResizeStep

        // The direction of the resize pane, vertically or horizontally
        let directionvh: SplitOrientation = 'h'

        const isDecreasing: boolean = direction === 'dv' || direction === 'dh'

        if (direction === 'dh') {
            directionvh = 'h'
        }
        if (direction === 'dv') {
            directionvh = 'v'
        }
        if (direction === 'h') {
            directionvh = 'h'
        }
        if (direction === 'v') {
            directionvh = 'v'
        }
        if (!this.focusedTab) {
            console.debug('No currently focused tab')
            return
        }

        let currentContainer: BaseTabComponent | SplitContainer = this.focusedTab
        let child: BaseTabComponent | SplitContainer | null = this.focusedTab
        let curSplitOrientation: SplitOrientation | null = null

        // Find the first split that is in the orientations that the user chooses to change
        while (curSplitOrientation !== directionvh) {
            const parentContainer = this.getParentOf(currentContainer)
            if (!parentContainer) {
                return
            }
            child = currentContainer
            currentContainer = parentContainer
            if (currentContainer instanceof SplitContainer) {
                curSplitOrientation = currentContainer.orientation
            }
        }

        if (!(currentContainer instanceof SplitContainer)) {
            return
        }

        // Determine which index in the ratios refers to the child that will be modified
        const currentChildIndex = currentContainer.children.indexOf(child)

        let updatedRatio = 0
        if (isDecreasing) {
            updatedRatio = currentContainer.ratios[currentChildIndex] - resizeStep
            if (updatedRatio < 0) {
                return
            }
        } else {
            updatedRatio = currentContainer.ratios[currentChildIndex] + resizeStep
            if (updatedRatio > 1) {
                return
            }
        }

        currentContainer.ratios[currentChildIndex] = updatedRatio
        this.layout()
    }

    private getPaneRect (pane: BaseTabComponent): DOMRect {
        const viewRef = this.viewRefs.get(pane)!
        const element = viewRef.rootNodes[0] as HTMLElement
        return element.getBoundingClientRect()
    }

    getNearestPaneInDirection (from: BaseTabComponent, direction: SplitDirection): BaseTabComponent {
        const rect = this.getPaneRect(from)

        let nearest: BaseTabComponent | null = null
        let nearestDistance = Infinity

        let panes = this.getAllTabs().map(pane => ({ pane, rect: this.getPaneRect(pane) }))

        if (direction === 'l') {
            panes = panes.filter(pane => pane.rect.right <= rect.left)
        } else if (direction === 'r') {
            panes = panes.filter(pane => pane.rect.left >= rect.right)
        } else if (direction === 't') {
            panes = panes.filter(pane => pane.rect.bottom <= rect.top)
        } else {
            panes = panes.filter(pane => pane.rect.top >= rect.bottom)
        }

        for (const pane of panes) {
            if (pane.pane === from) {
                continue
            }
            const distance = Math.abs(rect.left + rect.width / 2 - pane.rect.left - pane.rect.width / 2) + Math.abs(rect.top + rect.height / 2 - pane.rect.top - pane.rect.height / 2)
            if (distance < nearestDistance) {
                nearest = pane.pane
                nearestDistance = distance
            }
        }

        return nearest ?? from
    }

    /**
     * Moves focus in the given direction
     */
    navigate (dir: SplitDirection): void {
        if (!this.focusedTab) {
            return
        }

        this.focus(this.getNearestPaneInDirection(this.focusedTab, dir))
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

    navigateSpecific (target: number): void {
        const all = this.getAllTabs()
        if (target >= all.length) {
            return
        }

        this.focus(all[target])
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
    async getRecoveryToken (options?: GetRecoveryTokenOptions): Promise<any> {
        return this.root.serialize(this.tabRecovery, options)
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
    onSpannerResizing (state: boolean): void {
        this._spannerResizing = state
    }

    /** @hidden */
    onTabDropped (tab: BaseTabComponent, zone: SplitDropZoneInfo) { // eslint-disable-line @typescript-eslint/explicit-module-boundary-types
        if (tab === this) {
            return
        }

        if (zone.type === 'relative') {
            this.add(tab, zone.relativeTo ?? null, zone.side)
        } else {
            this.add(tab, zone.container.children[zone.position], zone.container.orientation === 'h' ? 'r' : 'b')
        }
        this.tabAdopted.next(tab)
    }

    destroy (): void {
        for (const x of this.getAllTabs()) {
            x.destroy()
        }
        super.destroy()
    }

    layout (): void {
        this.root.normalize()
        this._spanners = []
        this._dropZones = []
        this.layoutInternal(this.root, 0, 0, 100, 100)
    }

    clearActivity (): void {
        for (const tab of this.getAllTabs()) {
            tab.clearActivity()
        }
        super.clearActivity()
    }

    get icon (): string|null {
        return this.getFocusedTab()?.icon ?? this.getAllTabs()[0]?.icon ?? null
    }

    set icon (icon: string|null) {
        for (const t of this.getAllTabs()) {
            t.icon = icon
        }
    }

    get color (): string|null {
        return this.getFocusedTab()?.color ?? this.getAllTabs()[0]?.color ?? null
    }

    set color (color: string|null) {
        for (const t of this.getAllTabs()) {
            t.color = color
        }
    }

    equalize (): void {
        this.root.normalize()
        this.root.equalize()
    }

    private updateTitle (): void {
        if (this.disableDynamicTitle) {
            return
        }
        const titles = [
            this.getFocusedTab()?.title,
            ...this.getAllTabs()
                .filter(x => x !== this.getFocusedTab())
                .map(x => x.title),
        ]
        this.setTitle([...new Set(titles)].join(' | '))
    }

    private attachTabView (tab: BaseTabComponent) {
        const ref = tab.insertIntoContainer(this.viewContainer)
        this.viewRefs.set(tab, ref)
        tab.addEventListenerUntilDestroyed(ref.rootNodes[0], 'click', () => this.focus(tab))
        if (this.config.store.terminal.focusFollowsMouse) {
            tab.addEventListenerUntilDestroyed(ref.rootNodes[0], 'mousemove', () => {
                if (this._spannerResizing) {
                    return
                }
                this.focus(tab)
            })
        }

        tab.subscribeUntilDestroyed(
            this.observeUntilChildDetached(tab, tab.focused$),
            () => this.updateTitle(),
        )
        tab.subscribeUntilDestroyed(
            this.observeUntilChildDetached(tab, tab.titleChange$),
            () => this.updateTitle(),
        )
        tab.subscribeUntilDestroyed(
            this.observeUntilChildDetached(tab, tab.activity$),
            a => a ? this.displayActivity() : this.clearActivity(),
        )
        tab.subscribeUntilDestroyed(
            this.observeUntilChildDetached(tab, tab.progress$),
            p => this.setProgress(p),
        )
        if (tab.title) {
            this.updateTitle()
        }
        tab.subscribeUntilDestroyed(
            this.observeUntilChildDetached(tab, tab.recoveryStateChangedHint$),
            () => {
                this.recoveryStateChangedHint.next()
            },
        )
        tab.destroyed$.subscribe(() => {
            this.removeTab(tab)
        })
    }

    private observeUntilChildDetached<T> (tab: BaseTabComponent, event: Observable<T>): Observable<T> {
        return event.pipe(takeWhile(() => {
            return this.getAllTabs().includes(tab)
        }))
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
        const thickness = 10

        if (root === this.root) {
            this._dropZones.push({
                x: x - thickness / 2,
                y: y + thickness,
                w: thickness,
                h: h - thickness * 2,
                type: 'relative',
                side: 'l',
            })
            this._dropZones.push({
                x,
                y: y - thickness / 2,
                w,
                h: thickness,
                type: 'relative',
                side: 't',
            })
            this._dropZones.push({
                x: x + w - thickness / 2,
                y: y + thickness,
                w: thickness,
                h: h - thickness * 2,
                type: 'relative',
                side: 'r',
            })
            this._dropZones.push({
                x,
                y: y + h - thickness / 2,
                w,
                h: thickness,
                type: 'relative',
                side: 'b',
            })
        }

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
                }
            }

            offset += sizes[i]

            if (i !== root.ratios.length - 1) {
                // Spanner area
                this._dropZones.push({
                    type: 'relative',
                    relativeTo: root.children[i],
                    side: root.orientation === 'v' ? 'b': 'r',
                    x: root.orientation === 'v' ? childX + thickness : childX + offset - thickness / 2,
                    y: root.orientation === 'v' ? childY + offset - thickness / 2 : childY + thickness,
                    w: root.orientation === 'v' ? childW - thickness * 2 : thickness,
                    h: root.orientation === 'v' ? thickness : childH - thickness * 2,
                })
            }

            // Sides
            if (root.orientation === 'v') {
                this._dropZones.push({
                    x: childX,
                    y: childY + thickness,
                    w: thickness,
                    h: childH - thickness * 2,
                    type: 'relative',
                    relativeTo: child,
                    side: 'l',
                })
                this._dropZones.push({
                    x: childX + w - thickness,
                    y: childY + thickness,
                    w: thickness,
                    h: childH - thickness * 2,
                    type: 'relative',
                    relativeTo: child,
                    side: 'r',
                })
            } else {
                this._dropZones.push({
                    x: childX + thickness,
                    y: childY,
                    w: childW - thickness * 2,
                    h: thickness,
                    type: 'relative',
                    relativeTo: child,
                    side: 't',
                })
                this._dropZones.push({
                    x: childX + thickness,
                    y: childY + childH - thickness,
                    w: childW - thickness * 2,
                    h: thickness,
                    type: 'relative',
                    relativeTo: child,
                    side: 'b',
                })
            }

            if (i !== 0) {
                this._spanners.push({
                    container: root,
                    index: i,
                })
            }
        })
    }

    private async recoverContainer (root: SplitContainer, state: any) {
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
                await this.recoverContainer(child, childState)
                children.push(child)
            } else {
                const recovered = await this.tabRecovery.recoverTab(childState)
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
}
