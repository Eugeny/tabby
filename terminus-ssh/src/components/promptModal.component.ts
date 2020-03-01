import { Component, Input, ViewChild, ElementRef } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'

/** @hidden */
@Component({
    template: require('./promptModal.component.pug'),
})
export class PromptModalComponent {
    @Input() value: string
    @Input() password: boolean
    @Input() remember: boolean
    @Input() showRememberCheckbox: boolean
    @ViewChild('input') input: ElementRef

    constructor (
        private modalInstance: NgbActiveModal,
    ) { }

    ngOnInit (): void {
        setTimeout(() => {
            this.input.nativeElement.focus()
        })
    }

    ok (): void {
        this.modalInstance.close({
            value: this.value,
            remember: this.remember,
        })
    }

    cancel (): void {
        this.modalInstance.close(null)
    }
}
