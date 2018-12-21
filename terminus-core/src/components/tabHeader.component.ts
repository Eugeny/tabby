import { Component, Input, HostBinding, HostListener, NgZone, ViewChild, ElementRef } from '@angular/core'
import { SortableComponent } from 'ng2-dnd'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { BaseTabComponent } from './baseTab.component'
import { RenameTabModalComponent } from './renameTabModal.component'
import { HotkeysService } from '../services/hotkeys.service'
import { ElectronService } from '../services/electron.service'
import { AppService } from '../services/app.service'
import { HostAppService, Platform } from '../services/hostApp.service'

const COLORS = [
    { name: 'No color', value: null },
    { name: 'Blue', value: '#0275d8' },
    { name: 'Green', value: '#5cb85c' },
    { name: 'Orange', value: '#f0ad4e' },
    { name: 'Purple', value: '#613d7c' },
    { name: 'Red', value: '#d9534f' },
    { name: 'Yellow', value: '#ffd500' },
]

@Component({
    selector: 'tab-header',
    template: require('./tabHeader.component.pug'),
    styles: [require('./tabHeader.component.scss')],
})
export class TabHeaderComponent {
    @Input() index: number
    @Input() @HostBinding('class.active') active: boolean
    @Input() @HostBinding('class.has-activity') hasActivity: boolean
    @Input() tab: BaseTabComponent
    @Input() progress: number
    @ViewChild('handle') handle: ElementRef

    private completionNotificationEnabled = false

    constructor (
        public app: AppService,
        private electron: ElectronService,
        private zone: NgZone,
        private hostApp: HostAppService,
        private ngbModal: NgbModal,
        private hotkeys: HotkeysService,
        private parentDraggable: SortableComponent,
    ) {
        this.hotkeys.matchedHotkey.subscribe((hotkey) => {
            if (this.app.activeTab === this.tab) {
                if (hotkey === 'rename-tab') {
                    this.showRenameTabModal()
                }
            }
        })
    }

    ngOnInit () {
        if (this.hostApp.platform === Platform.macOS) {
            this.parentDraggable.setDragHandle(this.handle.nativeElement)
        }
        this.tab.progress$.subscribe(progress => {
            this.progress = progress
        })
    }

    showRenameTabModal (): void {
        let modal = this.ngbModal.open(RenameTabModalComponent)
        modal.componentInstance.value = this.tab.customTitle || this.tab.title
        modal.result.then(result => {
            this.tab.setTitle(result)
            this.tab.customTitle = result
        }).catch(() => null)
    }

    @HostListener('dblclick') onDoubleClick (): void {
        this.showRenameTabModal()
    }

    @HostListener('auxclick', ['$event']) async onAuxClick ($event: MouseEvent) {
        if ($event.which === 2) {
            this.app.closeTab(this.tab, true)
        }
        if ($event.which === 3) {
            event.preventDefault()

            let contextMenu = this.electron.remote.Menu.buildFromTemplate([
                {
                    label: 'Close',
                    click: () => this.zone.run(() => {
                        this.app.closeTab(this.tab, true)
                    })
                },
                {
                    label: 'Close other tabs',
                    click: () => this.zone.run(() => {
                        for (let tab of this.app.tabs.filter(x => x !== this.tab)) {
                            this.app.closeTab(tab, true)
                        }
                    })
                },
                {
                    label: 'Close tabs to the right',
                    click: () => this.zone.run(() => {
                        for (let tab of this.app.tabs.slice(this.app.tabs.indexOf(this.tab) + 1)) {
                            this.app.closeTab(tab, true)
                        }
                    })
                },
                {
                    label: 'Close tabs to the left',
                    click: () => this.zone.run(() => {
                        for (let tab of this.app.tabs.slice(0, this.app.tabs.indexOf(this.tab))) {
                            this.app.closeTab(tab, true)
                        }
                    })
                },
                {
                    label: 'Rename',
                    click: () => this.zone.run(() => this.showRenameTabModal())
                },
                {
                    label: 'Color',
                    sublabel: COLORS.find(x => x.value === this.tab.color).name,
                    submenu: COLORS.map(color => ({
                        label: color.name,
                        type: 'radio',
                        checked: this.tab.color === color.value,
                        click: () => this.zone.run(() => {
                            this.tab.color = color.value
                        }),
                    })),
                }
            ])

            if ((this.tab as any).saveAsProfile) {
                contextMenu.append(new this.electron.MenuItem({
                    label: 'Save as a profile',
                    click: () => this.zone.run(() => (this.tab as any).saveAsProfile())
                }))
            }

            let process = await this.tab.getCurrentProcess()
            if (process) {
                contextMenu.append(new this.electron.MenuItem({
                    id: 'sep',
                    type: 'separator',
                }))
                contextMenu.append(new this.electron.MenuItem({
                    id: 'process-name',
                    enabled: false,
                    label: 'Current process: ' + process.name,
                }))
                contextMenu.append(new this.electron.MenuItem({
                    id: 'completion',
                    label: 'Notify when done',
                    type: 'checkbox',
                    checked: this.completionNotificationEnabled,
                    click: () => this.zone.run(() => {
                        this.completionNotificationEnabled = !this.completionNotificationEnabled

                        if (this.completionNotificationEnabled) {
                            this.app.observeTabCompletion(this.tab).subscribe(() => {
                                new Notification('Process completed', {
                                    body: process.name,
                                }).addEventListener('click', () => {
                                    this.app.selectTab(this.tab)
                                })
                                this.completionNotificationEnabled = false
                            })
                        } else {
                            this.app.stopObservingTabCompletion(this.tab)
                        }
                    })
                }))
            }

            contextMenu.popup({
                x: $event.pageX,
                y: $event.pageY,
                async: true,
            })
        }
    }
}
