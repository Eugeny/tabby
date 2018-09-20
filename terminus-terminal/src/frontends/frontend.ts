import { Observable, Subject, AsyncSubject, ReplaySubject, BehaviorSubject } from 'rxjs'
import { ResizeEvent } from '../api'

export abstract class Frontend {
    enableResizing = true
    protected ready = new AsyncSubject<void>()
    protected title = new ReplaySubject<string>(1)
    protected alternateScreenActive = new BehaviorSubject<boolean>(false)
    protected mouseEvent = new Subject<MouseEvent>()
    protected bell = new Subject<void>()
    protected contentUpdated = new Subject<void>()
    protected input = new Subject<string>()
    protected resize = new ReplaySubject<ResizeEvent>(1)
    protected dragOver = new Subject<DragEvent>()
    protected drop = new Subject<DragEvent>()

    get ready$ (): Observable<void> { return this.ready }
    get title$ (): Observable<string> { return this.title }
    get alternateScreenActive$ (): Observable<boolean> { return this.alternateScreenActive }
    get mouseEvent$ (): Observable<MouseEvent> { return this.mouseEvent }
    get bell$ (): Observable<void> { return this.bell }
    get contentUpdated$ (): Observable<void> { return this.contentUpdated }
    get input$ (): Observable<string> { return this.input }
    get resize$ (): Observable<ResizeEvent> { return this.resize }
    get dragOver$ (): Observable<DragEvent> { return this.dragOver }
    get drop$ (): Observable<DragEvent> { return this.drop }

    abstract attach (host: HTMLElement): void
    detach (host: HTMLElement): void { } // tslint:disable-line

    destroy (): void {
        for (let o of [
            this.ready,
            this.title,
            this.alternateScreenActive,
            this.mouseEvent,
            this.bell,
            this.contentUpdated,
            this.input,
            this.resize,
            this.dragOver,
            this.drop,
        ]) {
            o.complete()
        }
    }

    abstract getSelection (): string
    abstract copySelection (): void
    abstract clearSelection (): void
    abstract focus (): void
    abstract write (data: string): void
    abstract clear (): void
    abstract visualBell (): void
    abstract scrollToBottom (): void

    abstract configure (configStore: any): void
    abstract setZoom (zoom: number): void
}
