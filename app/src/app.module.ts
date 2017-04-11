import { NgModule } from '@angular/core'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'

let plugins = [
    (<any>global).require('../terminus-settings').default,
    (<any>global).require('../terminus-terminal').default,
    (<any>global).require('../terminus-clickable-links').default,
    (<any>global).require('../terminus-community-color-schemes').default,
]

const core = (<any>global).require('../terminus-core').default,

@NgModule({
    imports: [
        core.forRoot(),
        ...plugins,
        NgbModule.forRoot(),
    ]
    //bootstrap: [AppRootComponent]
})
export class RootModule { }
