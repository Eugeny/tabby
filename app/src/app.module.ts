import { NgModule, Compiler, Inject, Injector, ɵcreateInjector as createInjector } from '@angular/core'
import '@angular/localize/init'
import { CommonModule } from '@angular/common'
import { BrowserModule } from '@angular/platform-browser'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { ToastrModule } from 'ngx-toastr'

@NgModule({
    imports: [
        BrowserModule,
        CommonModule,
        NgbModule,
        ToastrModule.forRoot({
            positionClass: 'toast-bottom-center',
            toastClass: 'toast',
            preventDuplicates: true,
            extendedTimeOut: 5000,
        }),
    ],
})
export class RootModule {
    constructor (
        private compiler: Compiler,
        private injector: Injector,
        @Inject('plugins') private plugins: any[],
    ) { }

    async ngDoBootstrap (app) {
        console.log('bootstrap', app)
        for (let plugin of this.plugins) {
            console.log(plugin)
            // try {
            const injector = createInjector(plugin, this.injector)
            console.log(injector)
                const module = await this.compiler.compileModuleAsync(plugin)
                console.log(module)
            // } catch (e) {
            //     console.error('Failed loading', plugin, e)
            // }
        }
    }
}


export function setupRootModule (plugins: any[]) {
    const bootstrap = [
        ...plugins.filter(x => x.bootstrap).map(x => x.bootstrap),
    ]

    if (bootstrap.length === 0) {
        throw new Error('Did not find any bootstrap components. Are there any plugins installed?')
    }
}
