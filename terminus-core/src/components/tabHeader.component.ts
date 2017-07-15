import { Component, Input, Output, EventEmitter, HostBinding, HostListener } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { BaseTabComponent } from './baseTab.component'
import { RenameTabModalComponent } from './renameTabModal.component'

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
    @Output() closeClicked = new EventEmitter()

    constructor (
        private ngbModal: NgbModal,
    ) { }

    @HostListener('dblclick') onDoubleClick (): void {
        let modal = this.ngbModal.open(RenameTabModalComponent)
        modal.componentInstance.value = this.tab.customTitle || this.tab.title
    }

    @HostListener('auxclick', ['$event']) onAuxClick ($event: MouseEvent): void {
        if ($event.which === 2) {
            this.closeClicked.emit()
        }
    }
}
