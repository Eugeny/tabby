import { Directive, ElementRef, AfterViewInit, OnDestroy } from '@angular/core'

/**
 * Animates btn-check based .btn-groups (segmented toggles): a single surface —
 * the group's ::before, positioned via the --segment-* variables — slides behind
 * the checked segment instead of the checked background snapping between buttons.
 * @hidden
 */
@Directive({
    selector: '.btn-group',
})
export class SegmentedToggleIndicatorDirective implements AfterViewInit, OnDestroy {
    private changeHandler = () => setTimeout(() => this.update())
    private initialized = false

    constructor (private el: ElementRef) { }

    ngAfterViewInit (): void {
        const host: HTMLElement = this.el.nativeElement
        if (!host.querySelector(':scope > .btn-check')) {
            return
        }
        host.classList.add('has-segment-indicator')
        host.addEventListener('change', this.changeHandler)
        // ngModel applies the initial checked state asynchronously
        setTimeout(() => this.update(), 100)
        setTimeout(() => this.update(), 500)
    }

    private update (): void {
        const host: HTMLElement = this.el.nativeElement
        const checked = host.querySelector<HTMLElement>(':scope > .btn-check:checked + .btn')
        if (!checked) {
            host.style.setProperty('--segment-opacity', '0')
            this.initialized = false
            return
        }
        const apply = () => {
            host.style.setProperty('--segment-left', `${checked.offsetLeft}px`)
            host.style.setProperty('--segment-top', `${checked.offsetTop}px`)
            host.style.setProperty('--segment-width', `${checked.offsetWidth}px`)
            host.style.setProperty('--segment-height', `${checked.offsetHeight}px`)
            host.style.setProperty('--segment-opacity', '1')
        }
        if (!this.initialized) {
            // first paint: place the indicator without animating it into position
            host.classList.add('segment-indicator-init')
            apply()
            void host.offsetWidth
            host.classList.remove('segment-indicator-init')
            this.initialized = true
        } else {
            apply()
        }
    }

    ngOnDestroy (): void {
        this.el.nativeElement.removeEventListener('change', this.changeHandler)
    }
}
