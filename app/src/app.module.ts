/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { ApplicationRef, ComponentFactoryResolver, NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
// import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
// import { ToastrModule } from 'ngx-toastr'

export function getRootModule (plugins: any[]) {
    const imports = [
        BrowserModule,
        ...plugins,
    ]

    const bootstrap = [
        ...plugins.filter(x => x.bootstrap).map(x => x.bootstrap),
    ]

    if (bootstrap.length === 0) {
        throw new Error('Did not find any bootstrap components. Are there any plugins installed?')
    }

    @NgModule({
        imports,
    }) class RootModule {
        constructor (private resolver: ComponentFactoryResolver) { }

        ngDoBootstrap (appRef: ApplicationRef) {
            (window as any)['requestAnimationFrame'] = window[window['Zone'].__symbol__('requestAnimationFrame')]

            bootstrap.forEach(componentDef => {
                const factory = this.resolver.resolveComponentFactory(componentDef)
                if (document.querySelector(factory.selector)) {
                    appRef.bootstrap(factory)
                }
            })
        }
    }

    return RootModule
}
