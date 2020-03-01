import { Directive, Input, ElementRef, OnChanges } from '@angular/core'

/** @hidden */
@Directive({
    selector: '[fastHtmlBind]',
})
export class FastHtmlBindDirective implements OnChanges {
    @Input() fastHtmlBind: string
    constructor (private el: ElementRef) { }

    ngOnChanges (): void {
        this.el.nativeElement.innerHTML = this.fastHtmlBind || ''
    }
}
