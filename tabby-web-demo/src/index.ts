import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'

import TabbyCorePlugin, { ProfileProvider, AppService } from 'tabby-core'
import TabbyTerminalModule from 'tabby-terminal'

import { DemoTerminalTabComponent } from './components/terminalTab.component'
import { DemoProfilesService } from './profiles'

/** @hidden */
@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
        NgbModule,
        TabbyCorePlugin,
        TabbyTerminalModule,
    ],
    providers: [
        { provide: ProfileProvider, useClass: DemoProfilesService, multi: true },
    ],
    entryComponents: [
        DemoTerminalTabComponent,
    ],
    declarations: [
        DemoTerminalTabComponent,
    ],
    exports: [
        DemoTerminalTabComponent,
    ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class DemoTerminalModule {
    constructor (
        app: AppService,
    ) {
        app.ready$.subscribe(() => {
            app.openNewTab({ type: DemoTerminalTabComponent })
        })
    }
}
