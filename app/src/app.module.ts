import { NgModule } from '@angular/core'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'

const projectRoot = '/home/eugene/Work/term/'
if (process.env.DEV) {
    (<any>global).require('module').globalPaths.push(projectRoot);
    (<any>global).require('module').globalPaths.push(projectRoot + 'app/node_modules')
}

let plugins = [
    (<any>global).require(projectRoot + 'terminus-settings').default,
    (<any>global).require(projectRoot + 'terminus-terminal').default,
    (<any>global).require(projectRoot + 'terminus-clickable-links').default,
    (<any>global).require(projectRoot + 'terminus-community-color-schemes').default,
]

const core = (<any>global).require(projectRoot + 'terminus-core')

@NgModule({
    imports: [
        core.AppRootModule.forRoot(),
        ...plugins,
        NgbModule.forRoot(),
    ],
    bootstrap: [core.AppRootComponent]
})
export class RootModule { }
