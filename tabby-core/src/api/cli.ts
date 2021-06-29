export interface CLIEvent {
    argv: any
    cwd: string
    secondInstance: boolean
}

export abstract class CLIHandler {
    priority: number
    firstMatchOnly: boolean

    abstract handle (event: CLIEvent): Promise<boolean>
}
