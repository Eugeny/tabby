import { Component, Input } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { SelectorOption } from '../api/selector'

/** @hidden */
@Component({
    template: require('./selectorModal.component.pug'),
    // styles: [require('./selectorModal.component.scss')],
})
export class SelectorModalComponent<T> {
    @Input() options: SelectorOption<T>[]
    @Input() filteredOptions: SelectorOption<T>[]
    @Input() filter = ''
    @Input() name: string

    constructor (
        public modalInstance: NgbActiveModal,
    ) { }

    ngOnInit () {
        this.onFilterChange()
    }

    onFilterChange () {
        const f = this.filter.trim().toLowerCase()
        if (!f) {
            this.filteredOptions = this.options
        } else {
            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            this.filteredOptions = this.options.filter(x => (x.name + (x.description || '')).toLowerCase().includes(f))
        }
    }

    onFilterEnter () {
        if (this.filteredOptions.length === 1) {
            this.selectOption(this.filteredOptions[0])
        }
    }

    selectOption (option: SelectorOption<T>) {
        this.modalInstance.close(option.result)
    }

    close () {
        this.modalInstance.dismiss()
    }
}
