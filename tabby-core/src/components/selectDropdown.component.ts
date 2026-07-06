/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Input, HostBinding } from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'

export interface SelectDropdownOption {
    value: any
    name: string
    disabled?: boolean
}

/**
 * Themed drop-in replacement for a native `<select>` — binds with `[(ngModel)]`
 * and renders the list as an ng-bootstrap dropdown, so the popup follows the app
 * theme instead of being OS-rendered.
 * @hidden
 */
@Component({
    selector: 'select-dropdown',
    templateUrl: './selectDropdown.component.pug',
    styleUrls: ['./selectDropdown.component.scss'],
    providers: [
        { provide: NG_VALUE_ACCESSOR, useExisting: SelectDropdownComponent, multi: true },
    ],
})
export class SelectDropdownComponent implements ControlValueAccessor {
    @Input() options: SelectDropdownOption[] = []
    @Input() placeholder = ''
    @HostBinding('class.disabled') @Input() disabled = false
    value: any
    private changed = new Array<(value: any) => void>()
    private touched = new Array<() => void>()

    get selectedName (): string {
        const found = this.options.find(o => o.value === this.value)
        return found ? found.name : this.placeholder
    }

    selectOption (option: SelectDropdownOption): void {
        if (option.disabled) {
            return
        }
        this.value = option.value
        this.changed.forEach(fn => fn(this.value))
        this.touched.forEach(fn => fn())
    }

    writeValue (value: any): void {
        this.value = value ?? null
    }

    registerOnChange (fn: any): void {
        this.changed.push(fn)
    }

    registerOnTouched (fn: any): void {
        this.touched.push(fn)
    }

    setDisabledState (isDisabled: boolean): void {
        this.disabled = isDisabled
    }
}
