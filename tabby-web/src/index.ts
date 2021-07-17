import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ConfigProvider, HostAppService, HostWindowService, LogService, PlatformService, UpdaterService } from 'tabby-core'

import { WebPlatformService } from './platform'
import { ConsoleLogService } from './services/log.service'
import { NullUpdaterService } from './services/updater.service'
import { WebHostWindow } from './services/hostWindow.service'
import { WebHostApp } from './services/hostApp.service'
import { MessageBoxModalComponent } from './components/messageBoxModal.component'
import { WebConfigProvider } from './config'

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
        { provide: HostAppService, useClass: WebHostApp },
        { provide: ConfigProvider, useClass: WebConfigProvider, multi: true },
    ],
    declarations: [
        MessageBoxModalComponent,
    ],
    entryComponents: [
        MessageBoxModalComponent,
    ],
})
export default class WebModule { } // eslint-disable-line @typescript-eslint/no-extraneous-class
