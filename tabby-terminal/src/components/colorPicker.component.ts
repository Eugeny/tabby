import { Component, Input, Output, EventEmitter } from '@angular/core'

/** @hidden */
@Component({
    selector: 'color-picker',
    templateUrl: './colorPicker.component.pug',
    styleUrls: ['./colorPicker.component.scss'],
})
export class ColorPickerComponent {
    @Input() model: string
    @Input() title: string
    @Input() hint: string
    @Output() modelChange = new EventEmitter<string>()
}
