/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { CommonModule } from '@angular/common'
import { ApplicationRef, Component, NgModule, ViewContainerRef } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { ToastrModule } from 'ngx-toastr'

@Component({
    standalone: true,
    imports: [CommonModule],
    selector: 'root',
    template: '<div *ngIf="true">Hi</div>',
})
export class RootComponent {
    static bootstrapComponent: any
    constructor (private viewContainerRef: ViewContainerRef) { }
    ngAfterViewInit () {
        // this.viewContainerRef.createComponent(RootComponent.bootstrapComponent)
    }
}

export function getRootModule (plugins: any[]) {
    const imports = [
        BrowserModule,
        // CommonModule,
        // ...plugins,
        // NgbModule,
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
        declarations: [RootComponent],
        // bootstrap,
        // bootstrap: [RootComponent],
    }) class RootModule {
        ngDoBootstrap (appRef: ApplicationRef) {
            (window as any)['requestAnimationFrame'] = window[window['Zone'].__symbol__('requestAnimationFrame')]

            bootstrap.forEach(componentDef => {
                RootComponent.bootstrapComponent = componentDef
                // const environmentInjector = appRef.injector
                // createComponent(componentDef, { environmentInjector })
                // const component = this.resolver.resolveComponentFactory(componentDef)
                // if (document.querySelector(factory.selector)) {
                //     appRef.bootstrap(component)
                // }
            })

            appRef.bootstrap(RootComponent)
        }
    }

    return RootModule
}
