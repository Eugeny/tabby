import { Observable, Subject } from 'rxjs'

export abstract class Screen {
    id: number
    name?: string
}

export abstract class DockingService {
    get screensChanged$ (): Observable<void> { return this.screensChanged }
    protected screensChanged = new Subject<void>()

    abstract dock (): void
    abstract getScreens (): Screen[]
}
