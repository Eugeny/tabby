import { Injectable } from '@angular/core'
import { ToastrService } from 'ngx-toastr'

export interface StickyNotification {
    dismiss (): void
}

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

    success (text: string, details?: string): void {
        this.toastr.success(text, details)
    }

    warning (text: string, details?: string): void {
        this.toastr.warning(text, details)
    }

    error (text: string, details?: string): void {
        this.toastr.error(text, details)
    }

    /** A warning toast that stays until `dismiss()` is called. */
    stickyWarning (text: string, details?: string): StickyNotification {
        const toast = this.toastr.warning(text, details, {
            disableTimeOut: true,
            tapToDismiss: false,
            closeButton: false,
            extendedTimeOut: 0,
            toastClass: 'toast toast-sticky-warning',
        })
        return {
            dismiss: () => this.toastr.clear(toast.toastId),
        }
    }
}
