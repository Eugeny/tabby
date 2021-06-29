import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core'
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap'

/** @hidden */
@Component({
    selector: 'color-picker',
    template: require('./colorPicker.component.pug'),
    styles: [require('./colorPicker.component.scss')],
})
export class ColorPickerComponent {
    @Input() model: string
    @Input() title: string
    @Output() modelChange = new EventEmitter<string>()
    @ViewChild('popover') popover: NgbPopover

    open (): void {
        setImmediate(() => {
            this.popover.open()
            this.popover['_windowRef'].location.nativeElement.querySelector('input').focus()
        })
    }

    onChange (): void {
        this.modelChange.emit(this.model)
    }
}
