import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { HostWindowService, LogService, PlatformService, UpdaterService } from 'terminus-core'

import { WebPlatformService } from './platform'
import { ConsoleLogService } from './services/log.service'
import { NullUpdaterService } from './services/updater.service'
import { WebHostWindow } from './services/hostWindow.service'
import { MessageBoxModalComponent } from './components/messageBoxModal.component'

import './styles.scss'

@NgModule({
    imports: [
        CommonModule,
    ],
    providers: [
        { provide: PlatformService, useClass: WebPlatformService },
        { provide: LogService, useClass: ConsoleLogService },
        { provide: UpdaterService, useClass: NullUpdaterService },
        { provide: HostWindowService, useClass: WebHostWindow },
    ],
    declarations: [
        MessageBoxModalComponent,
    ],
    entryComponents: [
        MessageBoxModalComponent,
    ],
})
export default class WebModule { } // eslint-disable-line @typescript-eslint/no-extraneous-class
