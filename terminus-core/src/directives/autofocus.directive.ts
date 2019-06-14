import { Directive, AfterViewInit, ElementRef } from '@angular/core'

/** @hidden */
@Directive({
    selector: '[autofocus]',
})
export class AutofocusDirective implements AfterViewInit {
    constructor (private el: ElementRef) { }

    ngAfterViewInit () {
        this.el.nativeElement.blur()
        setTimeout(() => {
            this.el.nativeElement.focus()
        })
    }
}
