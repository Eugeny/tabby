import { Component } from '@angular/core'
import { NG_VALUE_ACCESSOR } from '@angular/forms'
import { CheckboxComponent } from './checkbox.component'

/** @hidden */
@Component({
    selector: 'toggle',
    template: `
    <div class="custom-control custom-switch">
      <input type="checkbox" class="custom-control-input" [(ngModel)]='model'>
      <label class="custom-control-label"></label>
    </div>
    `,
    styles: [require('./toggle.component.scss')],
    providers: [
        { provide: NG_VALUE_ACCESSOR, useExisting: ToggleComponent, multi: true },
    ],
})
export class ToggleComponent extends CheckboxComponent {
}
