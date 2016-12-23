import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { HttpModule } from '@angular/http'
import { FormsModule } from '@angular/forms'
import { ToasterModule } from 'angular2-toaster'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { PerfectScrollbarModule } from 'angular2-perfect-scrollbar'
import { PerfectScrollbarConfigInterface } from 'angular2-perfect-scrollbar'

const PERFECT_SCROLLBAR_CONFIG: PerfectScrollbarConfigInterface = {
  suppressScrollX: true
}


import { ConfigService } from 'services/config'
import { ElectronService } from 'services/electron'
import { HostAppService } from 'services/hostApp'
import { LogService } from 'services/log'
import { ModalService } from 'services/modal'
import { NotifyService } from 'services/notify'
import { QuitterService } from 'services/quitter'
import { LocalStorageService } from 'angular2-localstorage/LocalStorageEmitter'

import { AppComponent } from 'components/app'
import { CheckboxComponent } from 'components/checkbox'
import { SettingsModalComponent } from 'components/settingsModal'


@NgModule({
    imports: [
        BrowserModule,
        HttpModule,
        FormsModule,
        ToasterModule,
        NgbModule.forRoot(),
        PerfectScrollbarModule.forRoot(PERFECT_SCROLLBAR_CONFIG),
    ],
    providers: [
        ConfigService,
        ElectronService,
        HostAppService,
        LogService,
        ModalService,
        NotifyService,
        QuitterService,
        LocalStorageService,
    ],
    entryComponents: [
        SettingsModalComponent,
    ],
    declarations: [
        AppComponent,
        CheckboxComponent,
        SettingsModalComponent,
    ],
    bootstrap: [
        AppComponent
    ]
})
export class AppModule {}
