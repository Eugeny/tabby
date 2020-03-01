/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { NgZone, Component, Input, HostBinding, HostListener } from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'

/** @hidden */
@Component({
    selector: 'checkbox',
    template: `
        <div class="custom-control custom-checkbox">
            <input type="checkbox" class="custom-control-input" [(ngModel)]='model'>
            <label class="custom-control-label">{{text}}</label>
        </div>
    `,
    providers: [
        { provide: NG_VALUE_ACCESSOR, useExisting: CheckboxComponent, multi: true },
    ],
})
export class CheckboxComponent implements ControlValueAccessor {
    @HostBinding('class.active') @Input() model: boolean
    @Input() disabled: boolean
    @Input() text: string
    private changed = new Array<(val: boolean) => void>()

    @HostListener('click') click () {
        NgZone.assertInAngularZone()
        if (this.disabled) {
            return
        }

        this.model = !this.model
        for (const fx of this.changed) {
            fx(this.model)
        }
    }

    writeValue (obj: any) {
        this.model = obj
    }

    registerOnChange (fn: any): void {
        this.changed.push(fn)
    }

    registerOnTouched (fn: any): void {
        this.changed.push(fn)
    }

    setDisabledState (isDisabled: boolean) {
        this.disabled = isDisabled
    }
}
