export abstract class Screen {
    id: number
    name?: string
}

export abstract class DockingService {
    abstract dock (): void
    abstract getScreens (): Screen[]
}
