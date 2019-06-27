import { Component } from '@angular/core'
import { NG_VALUE_ACCESSOR } from '@angular/forms'
import { CheckboxComponent } from './checkbox.component'

/** @hidden */
@Component({
    selector: 'toggle',
    template: `
      <div class="switch">
        <div class="body">
          <div class="toggle" [class.bg-primary]='model'>
            <i class="fa fa-check"></i>
          </div>
        </div>
      </div>
    `,
    styles: [require('./toggle.component.scss')],
    providers: [
        { provide: NG_VALUE_ACCESSOR, useExisting: ToggleComponent, multi: true },
    ],
})
export class ToggleComponent extends CheckboxComponent {
}
