
import { Injectable } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'

import { SelectorModalComponent } from '../components/selectorModal.component'
import { SelectorOption } from '../api/selector'

@Injectable({ providedIn: 'root' })
export class SelectorService {
    /** @hidden */
    private constructor (
        private ngbModal: NgbModal,
    ) { }

    show <T> (name: string, options: SelectorOption<T>[]): Promise<T> {
        const modal = this.ngbModal.open(SelectorModalComponent)
        const instance: SelectorModalComponent<T> = modal.componentInstance
        instance.name = name
        instance.options = options
        return modal.result as Promise<T>
    }
}
