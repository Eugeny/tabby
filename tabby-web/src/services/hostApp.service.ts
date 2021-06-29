import { Injectable, Injector } from '@angular/core'
import { HostAppService, Platform } from 'tabby-core'

@Injectable()
export class WebHostApp extends HostAppService {
    get platform (): Platform {
        return Platform.Web
    }

    get configPlatform (): Platform {
        return Platform.Windows // TODO
    }

    // Needed for injector metadata
    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor (
        injector: Injector,
    ) {
        super(injector)
    }

    newWindow (): void {
        throw new Error('Not implemented')
    }

    relaunch (): void {
        location.reload()
    }

    quit (): void {
        window.close()
    }
}
