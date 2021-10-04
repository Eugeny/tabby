import { Component, Input, HostListener, ViewChildren, QueryList, ElementRef } from '@angular/core' // eslint-disable-line @typescript-eslint/no-unused-vars
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { SelectorOption } from '../api/selector'

/** @hidden */
@Component({
    selector: 'selector-modal',
    template: require('./selectorModal.component.pug'),
    styles: [require('./selectorModal.component.scss')],
})
export class SelectorModalComponent<T> {
    @Input() options: SelectorOption<T>[]
    @Input() filteredOptions: SelectorOption<T>[]
    @Input() filter = ''
    @Input() name: string
    @Input() selectedIndex = 0
    hasGroups = false
    @ViewChildren('item') itemChildren: QueryList<ElementRef>

    constructor (
        public modalInstance: NgbActiveModal,
    ) { }

    ngOnInit (): void {
        this.onFilterChange()
        this.hasGroups = this.options.some(x => x.group)
    }

    @HostListener('keyup', ['$event']) onKeyUp (event: KeyboardEvent): void {
        if (event.key === 'ArrowUp') {
            this.selectedIndex--
            event.preventDefault()
        }
        if (event.key === 'ArrowDown') {
            this.selectedIndex++
            event.preventDefault()
        }
        if (event.key === 'Enter') {
            this.selectOption(this.filteredOptions[this.selectedIndex])
        }
        if (event.key === 'Escape') {
            this.close()
        }

        this.selectedIndex = (this.selectedIndex + this.filteredOptions.length) % this.filteredOptions.length
        Array.from(this.itemChildren)[this.selectedIndex]?.nativeElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
        })
    }

    onFilterChange (): void {
        const f = this.filter.trim().toLowerCase()
        if (!f) {
            this.filteredOptions = this.options.slice()
                .sort((a, b) => a.group?.localeCompare(b.group ?? '') ?? 0)
                .filter(x => !x.freeInputPattern)
        } else {
            const terms = f.split(' ')
            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            this.filteredOptions = this.options.filter(x => x.freeInputPattern ?? this.filterMatches(x, terms))
        }
        this.selectedIndex = Math.max(0, this.selectedIndex)
        this.selectedIndex = Math.min(this.filteredOptions.length - 1, this.selectedIndex)
    }

    filterMatches (option: SelectorOption<T>, terms: string[]): boolean {
        const content = (option.group ?? '') + option.name + (option.description ?? '')
        return terms.every(term => content.toLowerCase().includes(term))
    }

    getOptionText (option: SelectorOption<T>): string {
        if (option.freeInputPattern) {
            return option.freeInputPattern.replace('%s', this.filter)
        }
        return option.name
    }

    selectOption (option: SelectorOption<T>): void {
        option.callback?.(this.filter)
        this.modalInstance.close(option.result)
    }

    close (): void {
        this.modalInstance.dismiss()
    }

    iconIsSVG (icon?: string): boolean {
        return icon?.startsWith('<') ?? false
    }
}
