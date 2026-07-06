/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Input, HostBinding } from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'

export interface SelectDropdownOption {
    value: any
    name: string
    disabled?: boolean
    /** Options sharing a group render under a common header, like a native `<optgroup>` */
    group?: string
}

interface SelectDropdownOptionGroup {
    label: string|null
    options: SelectDropdownOption[]
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
    @Input() placeholder = ''
    @HostBinding('class.disabled') @Input() disabled = false
    value: any
    optionGroups: SelectDropdownOptionGroup[] = []
    private _options: SelectDropdownOption[] = []
    private changed = new Array<(value: any) => void>()
    private touched = new Array<() => void>()

    @Input()
    set options (value: SelectDropdownOption[]) {
        this._options = value
        this.rebuildOptionGroups()
    }

    get options (): SelectDropdownOption[] {
        return this._options
    }

    get selectedName (): string {
        const found = this._options.find(o => o.value === this.value)
        return found ? found.name : this.placeholder
    }

    private rebuildOptionGroups (): void {
        if (!this._options.some(o => o.group)) {
            this.optionGroups = this._options.length
                ? [{ label: null, options: [...this._options] }]
                : []
            return
        }

        const groups: SelectDropdownOptionGroup[] = []
        for (const option of this._options) {
            const label = option.group ?? null
            const last = groups.length > 0 ? groups[groups.length - 1] : null
            if (last && last.label === label) {
                last.options.push(option)
            } else {
                groups.push({ label, options: [option] })
            }
        }
        this.optionGroups = groups
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
