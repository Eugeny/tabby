import { HostBinding, ElementRef, Component } from '@angular/core'
import { BaseComponent } from './base.component'

@Component({})
export abstract class SelfPositioningComponent extends BaseComponent {
    @HostBinding('style.left') cssLeft = ''
    @HostBinding('style.top') cssTop = ''
    @HostBinding('style.width') cssWidth: string | null = null
    @HostBinding('style.height') cssHeight: string | null = null

    constructor (protected element: ElementRef) { super() }

    protected setDimensions (x: number, y: number, w: number, h: number, unit = '%'): void {
        this.cssLeft = `${x}${unit}`
        this.cssTop = `${y}${unit}`
        this.cssWidth = w ? `${w}${unit}` : null
        this.cssHeight = h ? `${h}${unit}` : null
    }
}
