import { NgZone, Component, Input, Output, EventEmitter } from '@angular/core'


@Component({
  selector: 'checkbox',
  template: require('./checkbox.pug'),
  styles: [require('./checkbox.less')]
})
export class CheckboxComponent {
    public click() {
        NgZone.assertInAngularZone()
        if (this.disabled) {
            return
        }

        this.model = !this.model
        this.modelChange.emit(this.model)
    }

    @Input() model: boolean
    @Output() modelChange = new EventEmitter()
    @Input() disabled: boolean

    @Input() text: string
}
