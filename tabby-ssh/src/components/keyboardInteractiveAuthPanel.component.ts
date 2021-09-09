import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core'
import { KeyboardInteractivePrompt } from '../session/ssh'


@Component({
    selector: 'keyboard-interactive-auth-panel',
    template: require('./keyboardInteractiveAuthPanel.component.pug'),
    styles: [require('./keyboardInteractiveAuthPanel.component.scss')],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeyboardInteractiveAuthComponent {
    @Input() prompt: KeyboardInteractivePrompt
    @Input() step = 0
    @Output() done = new EventEmitter()
    @ViewChild('input') input: ElementRef

    isPassword (): boolean {
        return this.prompt.prompts[this.step].toLowerCase().includes('password')
    }

    previous (): void {
        if (this.step > 0) {
            this.step--
        }
        this.input.nativeElement.focus()
    }

    next (): void {
        if (this.step === this.prompt.prompts.length - 1) {
            this.prompt.respond()
            this.done.emit()
            return
        }
        this.step++
        this.input.nativeElement.focus()
    }
}
