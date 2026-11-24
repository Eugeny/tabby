/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Input, HostBinding, HostListener, NgZone } from '@angular/core'
import { auditTime } from 'rxjs'

import { BaseTabComponent, TabProgress } from './baseTab.component'
// must load before app.service: splitTab <-> app.service is a cycle that only resolves in this order
import { SplitTabComponent } from './splitTab.component'
import { AppService } from '../services/app.service'
import { HostAppService, Platform } from '../api/hostApp'
import { ConfigService } from '../services/config.service'
import { CommandService } from '../services/commands.service'
import { MenuItemOptions } from '../api/menu'
import { PlatformService } from '../api/platform'
import { CommandContext, CommandLocation } from '../api/commands'

import { BaseComponent } from './base.component'

/** @hidden */
@Component({
    selector: 'tab-header',
    templateUrl: './tabHeader.component.pug',
    styleUrls: ['./tabHeader.component.scss'],
})
export class TabHeaderComponent extends BaseComponent {
    @Input() index: number
    @Input() @HostBinding('class.active') active: boolean
    @Input() tab: BaseTabComponent
    @Input() progress: TabProgress
    Platform = Platform

    constructor (
        public app: AppService,
        public config: ConfigService,
        public hostApp: HostAppService,
        private platform: PlatformService,
        private commands: CommandService,
        private zone: NgZone,
    ) {
        super()
    }

    ngOnInit () {
        this.subscribeUntilDestroyed(this.tab.progress$.pipe(
            auditTime(300),
        ), progress => {
            this.zone.run(() => {
                this.progress = progress
            })
        })
    }

    async buildContextMenu (): Promise<MenuItemOptions[]> {
        const contexts: CommandContext[] = [{ tab: this.tab }]

        // Top-level tab menu
        if (this.tab instanceof SplitTabComponent) {
            const tab = this.tab.getFocusedTab()
            if (tab) {
                contexts.push({ tab })
            }
        }

        return this.commands.buildContextMenu(contexts, CommandLocation.TabHeaderMenu)
    }

    onTabDragStart (tab: BaseTabComponent) {
        this.app.emitTabDragStarted(tab)
    }

    onTabDragEnd () {
        setTimeout(() => {
            this.app.emitTabDragEnded()
            this.app.emitTabsChanged()
        })
    }

    @HostBinding('class.flex-width') get isFlexWidthEnabled (): boolean {
        return this.config.store.appearance.flexTabs
    }

    @HostBinding('style.background-color') get tintedActiveTabBackground (): string|null {
        if (!this.active || !this.tab.color) {
            return null
        }
        return `color-mix(in srgb, ${this.tab.color} 20%, var(--body-bg))`
    }

    @HostListener('dblclick', ['$event']) onDoubleClick ($event: MouseEvent): void {
        this.app.renameTab(this.tab)
        $event.stopPropagation()
    }

    @HostListener('mousedown', ['$event']) async onMouseDown ($event: MouseEvent) {
        if ($event.which === 2) {
            $event.preventDefault()
        }
    }

    @HostListener('mouseup', ['$event']) async onMouseUp ($event: MouseEvent) {
        if ($event.which === 2) {
            this.app.closeTab(this.tab, true)
        }
    }

    @HostListener('contextmenu', ['$event']) async onContextMenu ($event: MouseEvent) {
        $event.preventDefault()
        this.platform.popupContextMenu(await this.buildContextMenu(), $event)
    }
}
