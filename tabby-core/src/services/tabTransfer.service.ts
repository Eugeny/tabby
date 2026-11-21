import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker'
import { Injectable, Inject, NgZone, Optional } from '@angular/core'
import { BehaviorSubject, Observable } from 'rxjs'
import { CdkDragEnd, CdkDragMove, CdkDragStart } from '@angular/cdk/drag-drop'
import { TranslateService } from '@ngx-translate/core'

import { BaseTabComponent } from '../components/baseTab.component'
import { SplitContainer, SplitTabComponent } from '../components/splitTab.component'
import { HostWindowService, TabTransferRequest } from '../api/hostWindow'
import { RecoveryToken } from '../api/tabRecovery'
import { TabTransferProvider } from '../api/tabTransfer'
import { AppService } from './app.service'
import { ConfigService } from './config.service'
import { Logger, LogService } from './log.service'
import { NotificationsService } from './notifications.service'
import { TabRecoveryService } from './tabRecovery.service'
import { TabsService } from './tabs.service'

/**
 * Moves tabs no other [[TabTransferProvider]] applies to by recreating them in the other window
 */
class RecreatingTabTransferProvider extends TabTransferProvider {
    weight = -Infinity

    applicableTo (): boolean {
        return true
    }

    async prepare (tab: BaseTabComponent): Promise<RecoveryToken|null> {
        return tab.getRecoveryToken({ includeState: true })
    }

    async release (tab: BaseTabComponent): Promise<void> {
        tab.destroy()
    }

    async cancel (): Promise<void> { } // eslint-disable-line @typescript-eslint/no-empty-function
}

interface PreparedTab {
    tab: BaseTabComponent
    provider: TabTransferProvider
}

/**
 * A placeholder for a tab that would be dropped into the tab bar
 */
export interface TabDropGhost {
    index: number
    title: string
}

interface ActiveDrag {
    tab: BaseTabComponent
    element: HTMLElement
    /** Where the drag started, relative to the window */
    start: { x: number, y: number }|null
    previewStarted: boolean
    pendingPosition: { screenX: number, screenY: number }|null
    stopWatchingFocus: () => void
}

/**
 * Moves tabs between windows when they are dragged out of the tab bar
 */
@Injectable({ providedIn: 'root' })
export class TabTransferService {
    private logger: Logger
    private fallbackProvider = new RecreatingTabTransferProvider()
    private transferInProgress = false
    private activeDrag: ActiveDrag|null = null
    private dropGhost = new BehaviorSubject<TabDropGhost|null>(null)

    /**
     * Where a tab being dragged over the tab bar would be dropped
     */
    get dropGhost$ (): Observable<TabDropGhost|null> { return this.dropGhost }

    private constructor (
        private app: AppService,
        private hostWindow: HostWindowService,
        private tabRecovery: TabRecoveryService,
        private tabsService: TabsService,
        private config: ConfigService,
        private notifications: NotificationsService,
        private translate: TranslateService,
        private zone: NgZone,
        @Optional() @Inject(TabTransferProvider) private providers: TabTransferProvider[]|null,
        log: LogService,
    ) {
        this.logger = log.create('tabTransfer')
        hostWindow.tabTransferRequest$.subscribe(request => this.receive(request))
        hostWindow.tabDragOver$.subscribe(over => {
            const index = over ? this.getTabBarIndex(over.screenX - window.screenX, over.screenY - window.screenY) : null
            this.setDropGhost(index === null ? null : { index, title: over!.title })
        })
    }

    handleDragStart (tab: BaseTabComponent, event: CdkDragStart): void {
        if (!this.hostWindow.supportsTabTransfer()) {
            return
        }
        // A drag can outlive the window losing focus (e.g. Alt+Tab), and then never
        // gets to see the mouse button being released - put the tab back instead
        const onBlur = () => this.cancelDrag()
        window.addEventListener('blur', onBlur)
        this.activeDrag = {
            tab,
            // By now the dragged element itself has been hidden, the placeholder sits where it was
            element: event.source.getPlaceholderElement(),
            start: null,
            previewStarted: false,
            pendingPosition: null,
            stopWatchingFocus: () => window.removeEventListener('blur', onBlur),
        }
    }

    /**
     * Keeps the dragged tab next to the cursor once it leaves the window
     */
    handleDragMove (tab: BaseTabComponent, event: CdkDragMove): void {
        const drag = this.activeDrag
        if (drag?.tab !== tab || !(event.event instanceof MouseEvent)) {
            return
        }

        // The drag has started where the pointer was before it moved by `distance`
        drag.start ??= {
            x: event.pointerPosition.x - event.distance.x,
            y: event.pointerPosition.y - event.distance.y,
        }

        if (!event.event.buttons) {
            // The button has been released somewhere we didn't get to hear about it
            this.cancelDrag()
            return
        }

        if (tab.parent instanceof SplitTabComponent) {
            // A pane can be dropped anywhere on the tab bar to become a tab of its own
            const index = this.getTabBarIndex(event.pointerPosition.x, event.pointerPosition.y)
            this.setDropGhost(index === null ? null : { index, title: tab.customTitle || tab.title })
        }

        if (!drag.previewStarted) {
            drag.previewStarted = true
            // Whatever is being dragged (a tab, a pane label, a toolbar handle),
            // the preview always looks like a tab of the tab bar
            const isTabHeader = drag.element.tagName === 'TAB-HEADER'
            const reference = isTabHeader ? drag.element : document.querySelector<HTMLElement>('app-root .tabs tab-header')
            const rect = reference?.getBoundingClientRect() ?? new DOMRect(0, 0, 200, 38)
            const style = getComputedStyle(reference ?? document.body)
            this.hostWindow.startTabDragPreview({
                rect: {
                    x: Math.round(rect.left),
                    y: Math.round(rect.top),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                },
                // Hold the tab where it has been grabbed, or near its start otherwise
                grabX: isTabHeader ? drag.start.x - rect.left : Math.min(24, rect.width / 2),
                grabY: isTabHeader ? drag.start.y - rect.top : rect.height / 2,
                title: tab.customTitle || tab.title,
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                background: this.getBackgroundColor(reference ?? document.body),
                foreground: style.color,
                accent: tab.color,
                movesWindow: this.isWholeWindow(tab),
                labels: {
                    newWindow: this.translate.instant(_('New window')),
                    moveWindow: this.translate.instant(_('Move window here')),
                    moveToWindow: this.translate.instant(_('Move to this window')),
                },
            })
        }

        // Coalesce pointer events into one update per frame
        const scheduled = !!drag.pendingPosition
        drag.pendingPosition = { screenX: event.event.screenX, screenY: event.event.screenY }
        if (!scheduled) {
            requestAnimationFrame(() => {
                if (this.activeDrag === drag && drag.pendingPosition) {
                    this.hostWindow.moveTabDragPreview(drag.pendingPosition.screenX, drag.pendingPosition.screenY)
                }
                drag.pendingPosition = null
            })
        }
    }

    /**
     * Moves the tab into another window, or a pane dropped on the tab bar into a tab of its own
     */
    handleDragEnd (tab: BaseTabComponent, event: CdkDragEnd): void {
        const ghost = this.dropGhost.value
        this.stopDrag()
        if (!this.hostWindow.supportsTabTransfer() || !(event.event instanceof MouseEvent)) {
            return
        }
        const { screenX, screenY } = event.event
        const isInsideWindow = screenX >= window.screenX && screenX < window.screenX + window.outerWidth &&
            screenY >= window.screenY && screenY < window.screenY + window.outerHeight
        if (isInsideWindow) {
            if (ghost && tab.parent instanceof SplitTabComponent) {
                tab.parent.removeTab(tab)
                this.app.moveTabToIndex(this.app.wrapAndAddTab(tab), ghost.index)
            }
            return
        }
        this.transfer(
            tab,
            screenX,
            screenY,
            event.dropPoint.x - event.distance.x,
            event.dropPoint.y - event.distance.y,
        )
    }

    /**
     * Where a tab dropped at the given point (relative to the window) goes in the tab bar
     *
     * @returns `null` if the point isn't over the tab bar
     */
    private getTabBarIndex (x: number, y: number): number|null {
        const tabBar = document.querySelector('app-root .tab-bar')
        if (!tabBar) {
            return null
        }
        const isInside = (element: Element|null) => {
            const rect = element?.getBoundingClientRect()
            return !!rect && x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom
        }
        const titleBar = document.querySelector('app-root title-bar')
        if (isInside(titleBar)) {
            // Dropping onto the title bar appends the tab
            return this.app.tabs.length
        }
        if (!isInside(tabBar)) {
            return null
        }
        const bounds = tabBar.getBoundingClientRect()
        const isVertical = bounds.height > bounds.width
        const headers = Array.from(tabBar.querySelectorAll('.tabs tab-header:not(.cdk-drag-placeholder)'))
        return headers.filter(header => {
            const rect = header.getBoundingClientRect()
            return isVertical ? rect.top + rect.height / 2 < y : rect.left + rect.width / 2 < x
        }).length
    }

    /**
     * Moves a top-level tab or a split pane into the window at the given screen
     * coordinates, or into a new window if there's none
     *
     * @param grabX  where the drag started, relative to this window
     */
    async transfer (tab: BaseTabComponent, screenX: number, screenY: number, grabX: number, grabY: number): Promise<void> {
        const topLevelTab = tab.topmostParent ?? tab
        if (this.transferInProgress || !this.app.tabs.includes(topLevelTab)) {
            return
        }
        this.transferInProgress = true
        try {
            const target = await this.hostWindow.findWindowAt(screenX, screenY)
            if (target === null && this.isWholeWindow(tab)) {
                // Nothing else would be left behind, so it's the window that moves
                this.hostWindow.moveTo(screenX, screenY, grabX, grabY)
                return
            }

            await this.sendTab(tab, target, screenX, screenY, grabX, grabY)
        } finally {
            this.transferInProgress = false
        }
    }

    private setDropGhost (ghost: TabDropGhost|null) {
        const current = this.dropGhost.value
        if (current?.index === ghost?.index && current?.title === ghost?.title) {
            return
        }
        // Drag events arrive outside of Angular's zone
        this.zone.run(() => this.dropGhost.next(ghost))
    }

    private stopDrag () {
        this.setDropGhost(null)
        if (this.activeDrag) {
            this.activeDrag.stopWatchingFocus()
            this.activeDrag = null
            this.hostWindow.endTabDragPreview()
        }
    }

    /**
     * Ends a drag that has lost track of the mouse button by releasing it where the drag
     * started, so the tab stays where it was
     */
    private cancelDrag () {
        const start = this.activeDrag?.start
        this.stopDrag()
        if (start) {
            document.dispatchEvent(new MouseEvent('mouseup', {
                bubbles: true,
                clientX: start.x,
                clientY: start.y,
                screenX: window.screenX + start.x,
                screenY: window.screenY + start.y,
            }))
        }
    }

    /**
     * The color the element is drawn on, looking through transparent backgrounds
     */
    private getBackgroundColor (element: HTMLElement): string {
        for (let e: HTMLElement|null = element; e; e = e.parentElement) {
            const color = getComputedStyle(e).backgroundColor
            if (color && color !== 'transparent' && !/^rgba\(.*,\s*0\)$/.test(color)) {
                return color
            }
        }
        return 'rgb(30, 30, 30)'
    }

    /**
     * Whether dragging the tab out leaves nothing behind in this window
     */
    private isWholeWindow (tab: BaseTabComponent): boolean {
        const topLevelTab = tab.topmostParent ?? tab
        return this.app.tabs.length === 1 && this.app.tabs[0] === topLevelTab && (
            topLevelTab === tab ||
            topLevelTab instanceof SplitTabComponent && topLevelTab.getAllTabs().length === 1
        )
    }

    private async sendTab (tab: BaseTabComponent, target: number|null, screenX: number, screenY: number, grabX: number, grabY: number): Promise<void> {
        const prepared: PreparedTab[] = []
        let token: RecoveryToken|null = null
        try {
            token = await this.prepareTab(tab, prepared)
        } catch (error) {
            this.logger.error('Could not prepare the tab for transfer:', error)
        }

        if (token && tab.parent) {
            // A pane dragged out of a split becomes a tab of its own
            token = {
                type: 'app:split-tab',
                orientation: 'h',
                ratios: [1],
                children: [token],
            }
        }

        let accepted = false
        if (token) {
            try {
                accepted = await this.hostWindow.sendTab(token, target, screenX, screenY, grabX, grabY)
            } catch (error) {
                this.logger.error('Could not send the tab:', error)
            }
        }

        if (!accepted) {
            for (const item of prepared) {
                await this.runSafely(() => item.provider.cancel(item.tab))
            }
            this.notifications.error(this.translate.instant(_('Could not move the tab to another window')))
            return
        }

        for (const item of prepared) {
            this.detach(item.tab)
            await this.runSafely(() => item.provider.release(item.tab))
        }

        if (!this.app.tabs.length) {
            this.hostWindow.close()
        }
    }

    private async receive (request: TabTransferRequest): Promise<void> {
        let accepted = false
        try {
            const params = await this.tabRecovery.recoverTab(request.token)
            if (params) {
                const tab = this.tabsService.create(params)
                this.app.addTabRaw(tab)
                // Put the tab where it has been dropped if that's over the tab bar
                const index = request.screenX !== undefined && request.screenY !== undefined
                    ? this.getTabBarIndex(request.screenX - window.screenX, request.screenY - window.screenY)
                    : null
                if (index !== null) {
                    this.app.moveTabToIndex(tab, index)
                }
                this.setDropGhost(null)
                accepted = true
            }
        } catch (error) {
            this.logger.error('Could not take over the tab:', error)
        }
        request.respond(accepted)
    }

    private async prepareTab (tab: BaseTabComponent, prepared: PreparedTab[]): Promise<RecoveryToken|null> {
        const token = tab instanceof SplitTabComponent
            ? await this.prepareContainer(tab.root, prepared)
            : await this.prepareLeafTab(tab, prepared)
        if (token) {
            this.tabRecovery.addTabMetadata(tab, token)
        }
        return token
    }

    private async prepareLeafTab (tab: BaseTabComponent, prepared: PreparedTab[]): Promise<RecoveryToken|null> {
        const provider = this.getProvider(tab)
        const token = await provider.prepare(tab)
        if (token) {
            prepared.push({ tab, provider })
        }
        return token
    }

    private async prepareContainer (container: SplitContainer, prepared: PreparedTab[]): Promise<RecoveryToken|null> {
        const children: RecoveryToken[] = []
        for (const child of container.children) {
            const token = child instanceof SplitContainer
                ? await this.prepareContainer(child, prepared)
                : await this.prepareTab(child, prepared)
            if (!token) {
                return null
            }
            children.push(token)
        }
        return {
            type: 'app:split-tab',
            ratios: [...container.ratios],
            orientation: container.orientation,
            children,
        }
    }

    private getProvider (tab: BaseTabComponent): TabTransferProvider {
        const providers = [...this.config.enabledServices(this.providers ?? [])]
        providers.sort((a, b) => b.weight - a.weight)
        return providers.find(provider => provider.applicableTo(tab)) ?? this.fallbackProvider
    }

    /**
     * Removes the tab from this window without destroying it
     */
    private detach (tab: BaseTabComponent) {
        if (tab.parent instanceof SplitTabComponent) {
            tab.parent.removeTab(tab)
        } else {
            this.app.detachTab(tab)
        }
    }

    private async runSafely (work: () => Promise<void>) {
        try {
            await work()
        } catch (error) {
            this.logger.error('Tab transfer step failed:', error)
        }
    }
}
