import { HostBinding, ElementRef } from '@angular/core'
import { BaseComponent } from './base.component'

export abstract class SelfPositioningComponent extends BaseComponent {
    @HostBinding('style.left') cssLeft: string
    @HostBinding('style.top') cssTop: string
    @HostBinding('style.width') cssWidth: string | null
    @HostBinding('style.height') cssHeight: string | null

    constructor (protected element: ElementRef) { super() }

    protected setDimensions (x: number, y: number, w: number, h: number, unit = '%'): void {
        this.cssLeft = `${x}${unit}`
        this.cssTop = `${y}${unit}`
        this.cssWidth = w ? `${w}${unit}` : null
        this.cssHeight = h ? `${h}${unit}` : null
    }
}
