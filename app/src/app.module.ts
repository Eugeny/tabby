import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'

export function getRootModule (plugins: any[]) {
    let imports = [
        BrowserModule,
        ...plugins,
        NgbModule.forRoot(),
    ]
    let bootstrap = [
        ...(plugins.filter(x => x.bootstrap).map(x => x.bootstrap)),
    ]

    if (bootstrap.length === 0) {
        throw new Error('Did not find any bootstrap components. Are there any plugins installed?')
    }

    @NgModule({
        imports,
        bootstrap,
    }) class RootModule { }

    return RootModule
}
