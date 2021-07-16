import { Component, Injector } from '@angular/core'
import { BaseTerminalTabComponent } from 'tabby-terminal'
import { Session } from '../session'

/** @hidden */
@Component({
    selector: 'demoTerminalTab',
    template: BaseTerminalTabComponent.template,
    styles: BaseTerminalTabComponent.styles,
    animations: BaseTerminalTabComponent.animations,
})
export class DemoTerminalTabComponent extends BaseTerminalTabComponent {
    session: Session|null = null

    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor (
        injector: Injector,
    ) {
        super(injector)
    }

    ngOnInit (): void {
        this.logger = this.log.create('terminalTab')
        this.session = new Session(this.injector, this.logger)
        super.ngOnInit()
    }

    protected onFrontendReady (): void {
        this.initializeSession()
        super.onFrontendReady()
    }

    initializeSession (): void {
        this.session!.start()
        this.attachSessionHandlers(true)
        this.recoveryStateChangedHint.next()
    }

    ngOnDestroy (): void {
        super.ngOnDestroy()
        this.session?.destroy()
    }
}
