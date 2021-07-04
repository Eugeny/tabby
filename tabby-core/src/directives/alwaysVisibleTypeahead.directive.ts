import { Directive, ElementRef, AfterViewInit } from '@angular/core'

/** @hidden */
@Directive({
    selector: '[alwaysVisibleTypeahead]',
})
export class AlwaysVisibleTypeaheadDirective implements AfterViewInit {
    constructor (private el: ElementRef) { }

    ngAfterViewInit (): void {
        this.el.nativeElement.addEventListener('focus', e => {
            e.stopPropagation()
            setTimeout(() => {
                const inputEvent: Event = new Event('input')
                e.target.dispatchEvent(inputEvent)
            }, 0)
        })
    }
}
