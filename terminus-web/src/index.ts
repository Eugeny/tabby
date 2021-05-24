import { NgModule } from '@angular/core'
import { LogService, PlatformService, UpdaterService } from 'terminus-core'

import { WebPlatformService } from './platform'
import { ConsoleLogService } from './services/log.service'
import { NullUpdaterService } from './services/updater.service'

import './styles.scss'

@NgModule({
    providers: [
        { provide: PlatformService, useClass: WebPlatformService },
        { provide: LogService, useClass: ConsoleLogService },
        { provide: UpdaterService, useClass: NullUpdaterService },
    ],
})
export default class WebModule { } // eslint-disable-line @typescript-eslint/no-extraneous-class
