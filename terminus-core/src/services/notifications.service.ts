import { Injectable } from '@angular/core'
import { ToastrService } from 'ngx-toastr'

@Injectable({ providedIn: 'root' })
export class NotificationsService {
    private constructor (
        private toastr: ToastrService,
    ) { }

    notice (text: string): void {
        this.toastr.info(text, undefined, {
            timeOut: 1000,
        })
    }

    info (text: string, details?: string): void {
        this.toastr.info(text, details)
    }

    error (text: string, details?: string): void {
        this.toastr.error(text, details)
    }
}
