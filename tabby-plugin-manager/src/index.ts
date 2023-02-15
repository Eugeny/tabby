import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'

import TabbyCorePlugin from 'tabby-core'
import { SettingsTabProvider } from 'tabby-settings'

import { PluginsSettingsTabComponent } from './components/pluginsSettingsTab.component'
import { PluginManagerService } from './services/pluginManager.service'
import { PluginsSettingsTabProvider } from './settings'

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        NgbModule,
        TabbyCorePlugin,
    ],
    providers: [
        { provide: SettingsTabProvider, useClass: PluginsSettingsTabProvider, multi: true },
    ],
    declarations: [
        PluginsSettingsTabComponent,
    ],
})
export default class PluginManagerModule { } // eslint-disable-line @typescript-eslint/no-extraneous-class

export { PluginManagerService }
