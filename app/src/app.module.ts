import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { loadPlugins } from './plugins'

export async function getRootModule(): Promise<any> {
    let plugins = await loadPlugins()
    let imports = [
        BrowserModule,
        ...(plugins.map(x => x.default.forRoot ? x.default.forRoot() : x.default)),
        NgbModule.forRoot(),
    ]
    let bootstrap = [
        ...(plugins.filter(x => x.bootstrap).map(x => x.bootstrap)),
    ]

    @NgModule({
        imports,
        bootstrap,
    }) class RootModule { }

    return RootModule
}
