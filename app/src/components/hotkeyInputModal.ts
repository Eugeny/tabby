import { Component, Input } from '@angular/core'
import { HotkeysService } from 'services/hotkeys'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { Subscription } from 'rxjs'

const INPUT_TIMEOUT = 2000


@Component({
  selector: 'hotkey-input-modal',
  template: require('./hotkeyInputModal.pug'),
  styles: [require('./hotkeyInputModal.less')],
})
export class HotkeyInputModalComponent {
    private keySubscription: Subscription
    private lastKeyEvent: number
    private keyTimeoutInterval: NodeJS.Timer

    @Input() value: string[] = []
    @Input() timeoutProgress = 0

    constructor(
        private modalInstance: NgbActiveModal,
        public hotkeys: HotkeysService,
    ) {
        this.keySubscription = hotkeys.key.subscribe(() => {
            this.lastKeyEvent = performance.now()
            this.value = this.hotkeys.getCurrentKeystrokes()
        })
    }

    splitKeys (keys: string): string[] {
        return keys.split('+').map((x) => x.trim())
    }

    ngOnInit () {
        this.keyTimeoutInterval = setInterval(() => {
            if (!this.lastKeyEvent) {
                return
            }
            this.timeoutProgress = (performance.now() - this.lastKeyEvent) * 100 / INPUT_TIMEOUT
            if (this.timeoutProgress >= 100) {
                this.modalInstance.close(this.value)
            }
        }, 25)
    }

    ngOnDestroy () {
        clearInterval(this.keyTimeoutInterval)
    }

    close() {
        this.modalInstance.dismiss()
    }
}
