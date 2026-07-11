import { Directive, ElementRef, Input, AfterViewInit, OnDestroy } from '@angular/core'

/**
 * Sliding active-item indicator shared by the settings sidebar and the selector
 * modal: a .nav-indicator surface is slid to the active item's box whenever the
 * active class moves. Item changes and resizes re-align without animating.
 * @hidden
 */
@Directive({
    selector: '[animatedNavIndicator]',
})
export class NavIndicatorDirective implements AfterViewInit, OnDestroy {
    @Input('animatedNavIndicator') activeSelector: string

    private indicator?: HTMLElement
    private observer?: MutationObserver
    private resizeObserver?: ResizeObserver
    private rect?: { top: number, left: number }

    constructor (private el: ElementRef) { }

    ngAfterViewInit (): void {
        const host: HTMLElement = this.el.nativeElement
        if (getComputedStyle(host).position === 'static') {
            host.style.position = 'relative'
        }
        this.indicator = document.createElement('div')
        this.indicator.className = 'nav-indicator'
        host.insertBefore(this.indicator, host.firstChild)

        this.observer = new MutationObserver(mutations => {
            const isNavigation = mutations.some(m => m.type === 'attributes')
            this.measure(isNavigation)
        })
        this.observer.observe(host, { attributes: true, attributeFilter: ['class'], subtree: true, childList: true })
        this.resizeObserver = new ResizeObserver(() => this.measure(false))
        this.resizeObserver.observe(host)
        setTimeout(() => this.measure(false), 100)
    }

    private measure (animate: boolean): void {
        const host: HTMLElement = this.el.nativeElement
        const indicator = this.indicator
        if (!indicator) {
            return
        }
        const active = host.querySelector<HTMLElement>(this.activeSelector || '.active')
        if (!active) {
            indicator.style.opacity = '0'
            this.rect = undefined
            return
        }

        const target = {
            top: active.offsetTop,
            left: active.offsetLeft,
            width: active.offsetWidth,
            height: active.offsetHeight,
        }
        const previous = this.rect
        this.rect = { top: target.top, left: target.left }

        indicator.style.top = `${target.top}px`
        indicator.style.left = `${target.left}px`
        indicator.style.width = `${target.width}px`
        indicator.style.height = `${target.height}px`
        indicator.style.opacity = '1'

        if (animate && previous && !document.body.classList.contains('no-animations')) {
            const dx = previous.left - target.left
            const dy = previous.top - target.top
            if (dx || dy) {
                indicator.animate([
                    { transform: `translate(${dx}px, ${dy}px)` },
                    { transform: 'none' },
                ], {
                    duration: 220,
                    easing: 'cubic-bezier(.4, .85, .3, 1)',
                })
            }
        }
    }

    ngOnDestroy (): void {
        this.observer?.disconnect()
        this.resizeObserver?.disconnect()
        this.indicator?.remove()
    }
}
