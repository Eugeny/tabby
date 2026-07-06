import { Directive, OnInit } from '@angular/core'
import { NgbDropdown } from '@ng-bootstrap/ng-bootstrap'

/**
 * Animates every NgbDropdown on close. close() destroys the Popper instance,
 * synchronously stripping the menu's positioning, so no CSS transition can ever
 * play — instead the menu is pinned at its on-screen position and faded out here.
 * @hidden
 */
@Directive({
    selector: '[ngbDropdown]',
})
export class DropdownCloseAnimationDirective implements OnInit {
    private closeAnimation: Animation|null = null

    constructor (private dropdown: NgbDropdown) { }

    ngOnInit (): void {
        // reopening mid-fade must cancel it, or the fade would run over the fresh menu
        const originalOpen = this.dropdown.open.bind(this.dropdown)
        this.dropdown.open = () => {
            this.closeAnimation?.cancel()
            this.closeAnimation = null
            originalOpen()
        }

        const originalClose = this.dropdown.close.bind(this.dropdown)
        this.dropdown.close = () => {
            const menu: HTMLElement|undefined = (this.dropdown as any)._menu?.nativeElement
            if (!menu || !this.dropdown.isOpen() || document.body.classList.contains('no-animations')) {
                originalClose()
                return
            }
            const rect = menu.getBoundingClientRect()
            originalClose()
            menu.classList.add('dropdown-menu-closing')
            // closed menus are display:none — force the menu visible for the fade
            menu.style.display = 'block'
            menu.style.position = 'fixed'
            menu.style.top = `${rect.top}px`
            menu.style.left = `${rect.left}px`
            menu.style.width = `${rect.width}px`
            menu.style.margin = '0'
            let done = false
            const cleanup = () => {
                if (done) {
                    return
                }
                done = true
                menu.classList.remove('dropdown-menu-closing')
                for (const prop of ['display', 'position', 'top', 'left', 'width', 'margin']) {
                    menu.style.removeProperty(prop)
                }
            }
            const animation = menu.animate([
                { opacity: 1, scale: '1' },
                { opacity: 0, scale: '0.97' },
            ], { duration: 140, easing: 'ease-out' })
            this.closeAnimation = animation
            animation.onfinish = cleanup
            animation.oncancel = cleanup
            setTimeout(cleanup, 400)
        }
    }
}
