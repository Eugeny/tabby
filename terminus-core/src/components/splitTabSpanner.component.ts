import { Component, Input, HostBinding, ElementRef, Output, EventEmitter } from '@angular/core'
import { SplitContainer } from './splitTab.component'

/** @hidden */
@Component({
    selector: 'split-tab-spanner',
    template: '',
    styles: [require('./splitTabSpanner.component.scss')],
})
export class SplitTabSpannerComponent {
    @Input() container: SplitContainer
    @Input() index: number
    @Output() change = new EventEmitter<void>()
    @HostBinding('class.active') isActive = false
    @HostBinding('class.h') isHorizontal = false
    @HostBinding('class.v') isVertical = true
    @HostBinding('style.left') cssLeft: string
    @HostBinding('style.top') cssTop: string
    @HostBinding('style.width') cssWidth: string | null
    @HostBinding('style.height') cssHeight: string | null
    private marginOffset = -5

    constructor (private element: ElementRef) { }

    ngAfterViewInit () {
        this.element.nativeElement.addEventListener('dblclick', () => {
            this.reset()
        })

        this.element.nativeElement.addEventListener('mousedown', (e: MouseEvent) => {
            this.isActive = true
            const start = this.isVertical ? e.pageY : e.pageX
            let current = start
            const oldPosition: number = this.isVertical ? this.element.nativeElement.offsetTop : this.element.nativeElement.offsetLeft

            const dragHandler = (e: MouseEvent) => {
                current = this.isVertical ? e.pageY : e.pageX
                const newPosition = oldPosition + (current - start)
                if (this.isVertical) {
                    this.element.nativeElement.style.top = `${newPosition - this.marginOffset}px`
                } else {
                    this.element.nativeElement.style.left = `${newPosition - this.marginOffset}px`
                }
            }

            const offHandler = () => {
                this.isActive = false
                document.removeEventListener('mouseup', offHandler)
                this.element.nativeElement.parentElement.removeEventListener('mousemove', dragHandler)

                let diff = (current - start) / (this.isVertical ? this.element.nativeElement.parentElement.clientHeight : this.element.nativeElement.parentElement.clientWidth)

                diff = Math.max(diff, -this.container.ratios[this.index - 1] + 0.1)
                diff = Math.min(diff, this.container.ratios[this.index] - 0.1)

                if (diff) {
                    this.container.ratios[this.index - 1] += diff
                    this.container.ratios[this.index] -= diff
                    this.change.emit()
                }
            }

            document.addEventListener('mouseup', offHandler, { passive: true })
            this.element.nativeElement.parentElement.addEventListener('mousemove', dragHandler)
        }, { passive: true })
    }

    ngOnChanges () {
        this.isHorizontal = this.container.orientation === 'h'
        this.isVertical = this.container.orientation === 'v'
        if (this.isVertical) {
            this.setDimensions(
                this.container.x,
                this.container.y + this.container.h * this.container.getOffsetRatio(this.index),
                this.container.w,
                0
            )
        } else {
            this.setDimensions(
                this.container.x + this.container.w * this.container.getOffsetRatio(this.index),
                this.container.y,
                0,
                this.container.h
            )
        }
    }

    reset () {
        const ratio = (this.container.ratios[this.index - 1] + this.container.ratios[this.index]) / 2
        this.container.ratios[this.index - 1] = ratio
        this.container.ratios[this.index] = ratio
        this.change.emit()
    }

    private setDimensions (x: number, y: number, w: number, h: number) {
        this.cssLeft = `${x}%`
        this.cssTop = `${y}%`
        this.cssWidth = w ? `${w}%` : null
        this.cssHeight = h ? `${h}%` : null
    }
}
