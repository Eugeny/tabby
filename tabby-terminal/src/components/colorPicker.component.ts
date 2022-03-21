import { Component, Input, Output, EventEmitter } from '@angular/core'

/** @hidden */
@Component({
    selector: 'color-picker',
    template: require('./colorPicker.component.pug'),
    styles: [require('./colorPicker.component.scss')],
})
export class ColorPickerComponent {
    @Input() model: string
    @Input() title: string
    @Input() hint: string
    @Output() modelChange = new EventEmitter<string>()

    onChange (value: string): void {
        if (value !== this.model) {
            this.modelChange.emit(value)
        }
    }
}
