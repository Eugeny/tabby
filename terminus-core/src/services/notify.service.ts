import { Injectable } from '@angular/core'
import { ToasterService } from 'angular2-toaster'

@Injectable()
export class NotifyService {
    constructor (
        private toaster: ToasterService,
    ) {}

    pop (options) {
        this.toaster.pop(options)
    }

    info (title: string, body: string = null) {
        return this.pop({
            type: 'info',
            title, body,
            timeout: 4000,
        })
    }

    success (title: string, body: string = null) {
        return this.pop({
            type: 'success',
            title, body,
            timeout: 4000,
        })
    }

    warning (title: string, body: string = null) {
        return this.pop({
            type: 'warning',
            title, body,
            timeout: 4000,
        })
    }

    error (title: string, body: string = null) {
        return this.pop({
            type: 'error',
            title, body,
            timeout: 4000,
        })
    }
}
