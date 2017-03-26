import { Component, Input, ViewContainerRef, ViewChild, ComponentFactoryResolver, ComponentRef } from '@angular/core'
import { SettingsProvider } from '../api'

@Component({
  selector: 'settings-tab-body',
  template: '<template #placeholder></template>',
})
export class SettingsTabBodyComponent {
    @Input() provider: SettingsProvider
    @ViewChild('placeholder', {read: ViewContainerRef}) placeholder: ViewContainerRef
    private component: ComponentRef<Component>

    constructor (private componentFactoryResolver: ComponentFactoryResolver) { }

    ngAfterViewInit () {
        // run after the change detection finishes
        setImmediate(() => {
            this.component = this.placeholder.createComponent(
                this.componentFactoryResolver.resolveComponentFactory(
                    this.provider.getComponentType()
                )
            )
        })
    }
}
