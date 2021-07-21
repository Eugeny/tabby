/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Input, Optional, Inject, HostBinding, HostListener, NgZone } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { TabContextMenuItemProvider } from '../api/tabContextMenuProvider'
import { BaseTabComponent } from './baseTab.component'
import { RenameTabModalComponent } from './renameTabModal.component'
import { HotkeysService } from '../services/hotkeys.service'
import { AppService } from '../services/app.service'
import { HostAppService, Platform } from '../api/hostApp'
import { ConfigService } from '../services/config.service'
import { BaseComponent } from './base.component'
import { MenuItemOptions } from '../api/menu'
import { PlatformService } from '../api/platform'

/** @hidden */
@Component({
    selector: 'tab-header',
    template: require('./tabHeader.component.pug'),
    styles: [require('./tabHeader.component.scss')],
})
export class TabHeaderComponent extends BaseComponent {
    @Input() index: number
    @Input() @HostBinding('class.active') active: boolean
    @Input() tab: BaseTabComponent
    @Input() progress: number|null
    Platform = Platform

    constructor (
        public app: AppService,
        public config: ConfigService,
        public hostApp: HostAppService,
        private ngbModal: NgbModal,
        private hotkeys: HotkeysService,
        private platform: PlatformService,
        private zone: NgZone,
        @Optional() @Inject(TabContextMenuItemProvider) protected contextMenuProviders: TabContextMenuItemProvider[],
    ) {
        super()
        this.subscribeUntilDestroyed(this.hotkeys.hotkey$, (hotkey) => {
            if (this.app.activeTab === this.tab) {
                if (hotkey === 'rename-tab') {
                    this.showRenameTabModal()
                }
            }
        })
        this.contextMenuProviders.sort((a, b) => a.weight - b.weight)
    }

    ngOnInit () {
        this.subscribeUntilDestroyed(this.tab.progress$, progress => {
            this.zone.run(() => {
                this.progress = progress
            })
        })
    }

    showRenameTabModal (): void {
        const modal = this.ngbModal.open(RenameTabModalComponent)
        modal.componentInstance.value = this.tab.customTitle || this.tab.title
        modal.result.then(result => {
            this.tab.setTitle(result)
            this.tab.customTitle = result
        }).catch(() => null)
    }

    async buildContextMenu (): Promise<MenuItemOptions[]> {
        let items: MenuItemOptions[] = []
        for (const section of await Promise.all(this.contextMenuProviders.map(x => x.getItems(this.tab, this)))) {
            items.push({ type: 'separator' })
            items = items.concat(section)
        }
        return items.slice(1)
    }

    @HostBinding('class.flex-width') get isFlexWidthEnabled (): boolean {
        return this.config.store.appearance.flexTabs
    }

    @HostListener('dblclick') onDoubleClick (): void {
        this.showRenameTabModal()
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
