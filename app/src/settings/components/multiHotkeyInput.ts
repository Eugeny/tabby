import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core'
import { ModalService } from 'services/modal'
import { HotkeyInputModalComponent } from './hotkeyInputModal'


@Component({
  selector: 'multi-hotkey-input',
  template: require('./multiHotkeyInput.pug'),
  styles: [require('./multiHotkeyInput.scss')],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiHotkeyInputComponent {
    constructor (
        private modal: ModalService,
    ) { }

    ngOnInit () {
        if (!this.model) {
            this.model = []
        }
        if (typeof this.model == 'string') {
            this.model = [this.model]
        }
        this.model = this.model.map(item => (typeof item == 'string') ? [item] : item)
    }

    editItem (item) {
        this.modal.open(HotkeyInputModalComponent).result.then((value: string[]) => {
            Object.assign(item, value)
            this.modelChange.emit(this.model)
        })
    }

    addItem () {
        this.modal.open(HotkeyInputModalComponent).result.then((value: string[]) => {
            this.model.push(value)
            this.modelChange.emit(this.model)
        })
    }

    removeItem (item) {
        this.model = this.model.filter(x => x !== item)
        this.modelChange.emit(this.model)
    }

    @Input() model: string[][]
    @Output() modelChange = new EventEmitter()
}
