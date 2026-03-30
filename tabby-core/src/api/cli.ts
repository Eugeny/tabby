export interface CLIEvent {
    argv: {
        _: string[],
        // Commands are hardcoded for now
        directory?: string,
        command?: string[],
        profileName?: string,
        text?: string,
        escape?: boolean,
        providerId?: string,
        query?: string,
        debug?: boolean,
        hidden?: boolean,
        profileNumber?: number,
    }
    cwd: string
    secondInstance: boolean
}

export abstract class CLIHandler {
    priority: number
    firstMatchOnly: boolean

    abstract handle (event: CLIEvent): Promise<boolean>
}
