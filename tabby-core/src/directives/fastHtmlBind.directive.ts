import { Directive, Input, ElementRef, OnChanges } from '@angular/core'
import { PlatformService } from '../api/platform'
import { isURLSchemeAllowed } from '../utils'

/** @hidden */
@Directive({
    selector: '[fastHtmlBind]',
})
export class FastHtmlBindDirective implements OnChanges {
    @Input() fastHtmlBind?: string
    private _lastValue?: string

    constructor (
        private el: ElementRef,
        private platform: PlatformService,
    ) { }

    ngOnChanges (): void {
        if (this.fastHtmlBind === this._lastValue) {
            return
        }
        this._lastValue = this.fastHtmlBind
        this.el.nativeElement.innerHTML = this.fastHtmlBind ?? ''
        for (const link of this.el.nativeElement.querySelectorAll('a')) {
            link.addEventListener('click', event => {
                event.preventDefault()
                if (!isURLSchemeAllowed(link.href)) {
                    return
                }
                this.platform.openExternal(link.href)
            })
        }
    }
}
