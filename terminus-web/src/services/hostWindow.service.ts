import { Injectable } from '@angular/core'
import { Observable, Subject } from 'rxjs'
import { HostWindowService } from 'terminus-core'

@Injectable({ providedIn: 'root' })
export class WebHostWindow extends HostWindowService {
    get closeRequest$ (): Observable<void> { return this.closeRequest }
    get isFullscreen (): boolean { return !!document.fullscreenElement }

    private closeRequest = new Subject<void>()

    reload (): void {
        location.reload()
    }

    setTitle (title?: string): void {
        document.title = title ?? 'Terminus'
    }

    toggleFullscreen (): void {
        if (this.isFullscreen) {
            document.exitFullscreen()
        } else {
            document.body.requestFullscreen({ navigationUI: 'hide' })
        }
    }

    minimize (): void {
        throw new Error('Unavailable')
    }

    toggleMaximize (): void {
        throw new Error('Unavailable')
    }

    close (): void {
        window.close()
    }
}
