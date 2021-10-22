import { Injectable } from '@angular/core'
import { ConfigService, HostWindowService } from 'tabby-core'

@Injectable({ providedIn: 'root' })
export class WebHostWindow extends HostWindowService {
    get isFullscreen (): boolean { return !!document.fullscreenElement }

    constructor (
        config: ConfigService,
    ) {
        super()
        this.windowShown.next()
        this.windowFocused.next()

        const unloadHandler = (event) => {
            if (config.store.web.preventAccidentalTabClosure) {
                event.preventDefault()
                event.returnValue = 'Are you sure you want to close Tabby? You can disable this prompt in Settings -> Window.'
            } else {
                window.removeEventListener('beforeunload', unloadHandler)
            }
        }
        window.addEventListener('beforeunload', unloadHandler)
    }

    reload (): void {
        location.reload()
    }

    setTitle (title?: string): void {
        document.title = title ?? 'Tabby'
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
