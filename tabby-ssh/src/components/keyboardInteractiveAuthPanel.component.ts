import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core'
import { KeyboardInteractivePrompt } from '../session/ssh'
import { SSHProfile } from '../api'
import { PasswordStorageService } from '../services/passwordStorage.service'
import { TOTPService } from '../services/totp.service'

@Component({
    selector: 'keyboard-interactive-auth-panel',
    templateUrl: './keyboardInteractiveAuthPanel.component.pug',
    styleUrls: ['./keyboardInteractiveAuthPanel.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeyboardInteractiveAuthComponent implements OnInit, OnDestroy {
    @Input() profile: SSHProfile
    @Input() prompt: KeyboardInteractivePrompt
    @Input() step = 0
    @Output() done = new EventEmitter()
    @ViewChild('input') input: ElementRef
    remember = false

    totpCode = ''
    totpTimeRemaining = 30
    private totpInterval?: any

    constructor (
        private passwordStorage: PasswordStorageService,
        private totpService: TOTPService,
        private changeDetector: ChangeDetectorRef,
    ) {}

    ngOnInit (): void {
        this.updateTOTPIfNeeded()
        this.startTOTPTimer()
        this.changeDetector.markForCheck()
    }

    ngOnDestroy (): void {
        if (this.totpInterval) {
            clearInterval(this.totpInterval)
        }
    }

    isPassword (): boolean {
        return this.prompt.isAPasswordPrompt(this.step)
    }

    isTOTP (): boolean {
        return this.prompt.isTOTPPrompt(this.step)
    }

    private updateTOTPIfNeeded (): void {
        if (this.isTOTP() && this.profile.options.totpSecret) {
            try {
                this.totpCode = this.totpService.generateTOTP(this.profile.options.totpSecret)
                this.prompt.responses[this.step] = this.totpCode
                this.changeDetector.markForCheck()
            } catch (error) {
                console.error('Failed to generate TOTP:', error)
            }
        }
    }

    private startTOTPTimer (): void {
        if (this.isTOTP() && this.profile.options.totpSecret) {
            this.totpInterval = setInterval(() => {
                this.totpTimeRemaining = this.totpService.getRemainingTime()
                if (this.totpTimeRemaining === 30) {
                    // 生成新的TOTP代码
                    this.updateTOTPIfNeeded()
                }
                this.changeDetector.markForCheck()
            }, 1000)
        }
    }

    previous (): void {
        if (this.step > 0) {
            this.step--
            this.updateTOTPIfNeeded()
            this.startTOTPTimer()
        }
        this.input.nativeElement.focus()
        this.changeDetector.markForCheck()
    }

    next (): void {
        if (this.isPassword() && this.remember) {
            this.passwordStorage.savePassword(this.profile, this.prompt.responses[this.step])
        }

        if (this.step === this.prompt.prompts.length - 1) {
            this.prompt.respond()
            this.done.emit()
            return
        }
        this.step++
        this.updateTOTPIfNeeded()
        this.startTOTPTimer()
        this.input.nativeElement.focus()
        this.changeDetector.markForCheck()
    }
}
