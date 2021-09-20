import { Component, Input } from '@angular/core'
import { trigger, transition, style, animate } from '@angular/animations'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { HotkeysService, BaseComponent, Keystroke } from 'tabby-core'

const INPUT_TIMEOUT = 1000

/** @hidden */
@Component({
    selector: 'hotkey-input-modal',
    template: require('./hotkeyInputModal.component.pug'),
    styles: [require('./hotkeyInputModal.component.scss')],
    animations: [
        trigger('animateKey', [
            transition(':enter', [
                style({
                    transform: 'translateX(25px)',
                    opacity: '0',
                }),
                animate('250ms ease-out', style({
                    transform: 'translateX(0)',
                    opacity: '1',
                })),
            ]),
            transition(':leave', [
                style({
                    transform: 'translateX(0)',
                    opacity: '1',
                }),
                animate('250ms ease-in', style({
                    transform: 'translateX(25px)',
                    opacity: '0',
                })),
            ]),
        ]),
    ],
})
export class HotkeyInputModalComponent extends BaseComponent {
    @Input() value: Keystroke[] = []
    @Input() timeoutProgress = 0

    private lastKeyEvent: number|null = null
    private keyTimeoutInterval: number|null = null

    constructor (
        private modalInstance: NgbActiveModal,
        public hotkeys: HotkeysService,
    ) {
        super()
        this.hotkeys.clearCurrentKeystrokes()
        this.subscribeUntilDestroyed(hotkeys.keyEvent$, event => {
            event.preventDefault()
            event.stopPropagation()
        })
        this.subscribeUntilDestroyed(hotkeys.keystroke$, keystroke => {
            this.lastKeyEvent = performance.now()
            this.value.push(keystroke)
        })
    }

    splitKeys (keys: string): string[] {
        return keys.split('+').map((x) => x.trim())
    }

    ngOnInit (): void {
        this.keyTimeoutInterval = window.setInterval(() => {
            if (!this.lastKeyEvent) {
                return
            }
            this.timeoutProgress = Math.min(100, (performance.now() - this.lastKeyEvent) * 100 / INPUT_TIMEOUT)
            if (this.timeoutProgress === 100) {
                clearInterval(this.keyTimeoutInterval!)
                this.modalInstance.close(this.value)
            }
        }, 25)
        this.hotkeys.disable()
    }

    ngOnDestroy (): void {
        clearInterval(this.keyTimeoutInterval!)
        this.hotkeys.clearCurrentKeystrokes()
        this.hotkeys.enable()
        super.ngOnDestroy()
    }

    close (): void {
        clearInterval(this.keyTimeoutInterval!)
        this.modalInstance.dismiss()
    }
}
