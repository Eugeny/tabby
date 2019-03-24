import { Component, Output, Input } from '@angular/core'
import { Subject } from 'rxjs'

/** @hidden */
@Component({
    selector: 'environment-editor',
    template: require('./environmentEditor.component.pug'),
    styles: [require('./environmentEditor.component.scss')],
})
export class EnvironmentEditorComponent {
    @Output() modelChange = new Subject<any>()
    vars: {key: string, value: string}[] = []
    private cachedModel: any

    @Input() get model (): any {
        return this.cachedModel
    }

    set model (value) {
        this.vars = Object.entries(value).map(([k, v]) => ({ key: k, value: v as string }))
        this.cachedModel = this.getModel()
    }

    getModel () {
        let model = {}
        for (let pair of this.vars) {
            model[pair.key] = pair.value
        }
        return model
    }

    emitUpdate () {
        this.cachedModel = this.getModel()
        this.modelChange.next(this.cachedModel)
    }

    addEnvironmentVar () {
        this.vars.push({ key: '', value: '' })
    }

    removeEnvironmentVar (key: string) {
        this.vars = this.vars.filter(x => x.key !== key)
        this.emitUpdate()
    }

}
