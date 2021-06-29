import { UpdaterService } from 'tabby-core'

export class NullUpdaterService extends UpdaterService {
    async check (): Promise<boolean> {
        return false
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    async update (): Promise<void> { }
}
