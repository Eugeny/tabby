import { Component, Input, Output, EventEmitter, HostListener, ViewChild } from '@angular/core'
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
    @ViewChild('input') input
    isOpen: boolean

    open () {
        setImmediate(() => {
            this.popover.open()
            setImmediate(() => {
                this.input.nativeElement.focus()
                this.isOpen = true
            })
        })
    }

    @HostListener('document:click', ['$event']) onOutsideClick ($event) {
        if (!this.isOpen) {
            return
        }
        const windowRef = (this.popover as any)._windowRef
        if (!windowRef) {
            return
        }
        if ($event.target !== windowRef.location.nativeElement &&
            !windowRef.location.nativeElement.contains($event.target)) {
            this.popover.close()
            this.isOpen = false
        }
    }

    onChange () {
        this.modelChange.emit(this.model)
    }
}
