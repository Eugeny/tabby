import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { FormsModule } from '@angular/forms'
import { NgPipesModule } from 'ngx-pipes'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'

import { SettingsTabProvider } from 'terminus-settings'

import { PluginsSettingsTabComponent } from './components/pluginsSettingsTab.component'
import { PluginManagerService } from './services/pluginManager.service'
import { PluginsSettingsTabProvider } from './settings'

@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
        NgbModule,
        NgPipesModule,
    ],
    providers: [
        { provide: SettingsTabProvider, useClass: PluginsSettingsTabProvider, multi: true },
    ],
    entryComponents: [
        PluginsSettingsTabComponent,
    ],
    declarations: [
        PluginsSettingsTabComponent,
    ],
})
export default class PluginManagerModule { }

export { PluginManagerService }
