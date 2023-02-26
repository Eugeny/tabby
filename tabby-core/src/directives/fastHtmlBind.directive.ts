import { Directive, Input, ElementRef, OnChanges } from '@angular/core'
import { PlatformService } from '../api/platform'

/** @hidden */
@Directive({
    selector: '[fastHtmlBind]',
})
export class FastHtmlBindDirective implements OnChanges {
    @Input() fastHtmlBind?: string

    constructor (
        private el: ElementRef,
        private platform: PlatformService,
    ) { }

    ngOnChanges (): void {
        this.el.nativeElement.innerHTML = this.fastHtmlBind ?? ''
        for (const link of this.el.nativeElement.querySelectorAll('a')) {
            link.addEventListener('click', event => {
                event.preventDefault()
                this.platform.openExternal(link.href)
            })
        }
    }
}
