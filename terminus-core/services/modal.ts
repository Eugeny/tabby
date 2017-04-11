import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'


@Injectable()
export class ModalService {
    constructor(
        private ngbModal: NgbModal,
    ) {}

    open(content: any, config?: any) {
        config = config || {}
        config.windowClass = 'out'
        let modal = this.ngbModal.open(content, config)

        let fx = (<any>modal)._removeModalElements.bind(modal);

        (<any>modal)._removeModalElements = () => {
            (<any>modal)._windowCmptRef.instance.windowClass = 'out'
            setTimeout(() => fx(), 500)
        }
        setTimeout(() => {
            (<any>modal)._windowCmptRef.instance.windowClass = ''
        }, 1)

        return modal
    }
}
