/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { ApplicationRef, NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { ToastrModule } from 'ngx-toastr'

export function getRootModule (plugins: any[]) {
    const imports = [
        BrowserModule,
        ...plugins,
        ToastrModule.forRoot({
            positionClass: 'toast-bottom-center',
            toastClass: 'toast',
            preventDuplicates: true,
            extendedTimeOut: 1000,
        }),
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
        ngDoBootstrap (appRef: ApplicationRef) {
            (window as any)['requestAnimationFrame'] = window[window['Zone'].__symbol__('requestAnimationFrame')]

            const componentDef = bootstrap[0]
            appRef.bootstrap(componentDef)
        }
    }

    return RootModule
}
