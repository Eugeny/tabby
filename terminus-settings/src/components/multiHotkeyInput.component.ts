import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { HotkeyInputModalComponent } from './hotkeyInputModal.component'

/** @hidden */
@Component({
    selector: 'multi-hotkey-input',
    template: require('./multiHotkeyInput.component.pug'),
    styles: [require('./multiHotkeyInput.component.scss')],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiHotkeyInputComponent {
    @Input() model: string[][]
    @Output() modelChange = new EventEmitter()

    constructor (
        private ngbModal: NgbModal,
    ) { }

    ngOnInit (): void {
        if (!this.model) {
            this.model = []
        }
        if (typeof this.model === 'string') {
            this.model = [this.model]
        }
        this.model = this.model.map(item => typeof item === 'string' ? [item] : item)
    }

    editItem (item: string[]): void {
        this.ngbModal.open(HotkeyInputModalComponent).result.then((value: string[]) => {
            this.model[this.model.findIndex(x => x === item)] = value
            this.model = this.model.slice()
            this.modelChange.emit(this.model)
        })
    }

    addItem (): void {
        this.ngbModal.open(HotkeyInputModalComponent).result.then((value: string[]) => {
            this.model = this.model.concat([value])
            this.modelChange.emit(this.model)
        })
    }

    removeItem (item: string[]): void {
        this.model = this.model.filter(x => x !== item)
        this.modelChange.emit(this.model)
    }
}
