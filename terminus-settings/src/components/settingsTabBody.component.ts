import { Component, Input } from '@angular/core'
import { SettingsTabProvider } from '../api'

@Component({
    selector: 'settings-tab-body',
    template: '<ng-container *ngComponentOutlet="provider.getComponentType()"></ng-container>',
})
export class SettingsTabBodyComponent {
    @Input() provider: SettingsTabProvider
}
