import { Observable } from 'rxjs'

export abstract class HostWindowService {
    abstract readonly closeRequest$: Observable<void>
    abstract readonly isFullscreen: boolean
    abstract reload (): void
    abstract setTitle (title?: string): void
    abstract toggleFullscreen (): void
    abstract minimize (): void
    abstract toggleMaximize (): void
    abstract close (): void
}
