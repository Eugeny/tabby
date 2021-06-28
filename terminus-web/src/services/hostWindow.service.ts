import { Injectable } from '@angular/core'
import { HostWindowService } from 'terminus-core'

@Injectable({ providedIn: 'root' })
export class WebHostWindow extends HostWindowService {
    get isFullscreen (): boolean { return !!document.fullscreenElement }

    constructor () {
        super()
        this.windowShown.next()
        this.windowFocused.next()
    }

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

    isMaximized (): boolean {
        return true
    }

    toggleMaximize (): void {
        throw new Error('Unavailable')
    }

    close (): void {
        window.close()
    }
}
