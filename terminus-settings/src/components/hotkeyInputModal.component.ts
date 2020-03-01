import { Component, Input } from '@angular/core'
import { trigger, transition, style, animate } from '@angular/animations'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { Subscription } from 'rxjs'
import { HotkeysService } from 'terminus-core'

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
export class HotkeyInputModalComponent {
    @Input() value: string[] = []
    @Input() timeoutProgress = 0

    private keySubscription: Subscription
    private lastKeyEvent: number|null = null
    private keyTimeoutInterval: number|null = null

    constructor (
        private modalInstance: NgbActiveModal,
        public hotkeys: HotkeysService,
    ) {
        this.hotkeys.clearCurrentKeystrokes()
        this.keySubscription = hotkeys.key.subscribe((event) => {
            this.lastKeyEvent = performance.now()
            this.value = this.hotkeys.getCurrentKeystrokes()
            event.preventDefault()
            event.stopPropagation()
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
                this.modalInstance.close(this.value)
            }
        }, 25)
        this.hotkeys.disable()
    }

    ngOnDestroy (): void {
        this.keySubscription.unsubscribe()
        this.hotkeys.clearCurrentKeystrokes()
        this.hotkeys.enable()
        clearInterval(this.keyTimeoutInterval!)
    }

    close (): void {
        this.modalInstance.dismiss()
    }
}
