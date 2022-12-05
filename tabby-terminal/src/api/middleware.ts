import { Subject, Observable } from 'rxjs'
import { SubscriptionContainer } from 'tabby-core'

export class SessionMiddleware {
    get outputToSession$ (): Observable<Buffer> { return this.outputToSession }
    get outputToTerminal$ (): Observable<Buffer> { return this.outputToTerminal }

    protected outputToSession = new Subject<Buffer>()
    protected outputToTerminal = new Subject<Buffer>()

    feedFromSession (data: Buffer): void {
        this.outputToTerminal.next(data)
    }

    feedFromTerminal (data: Buffer): void {
        this.outputToSession.next(data)
    }

    close (): void {
        this.outputToSession.complete()
        this.outputToTerminal.complete()
    }
}

export class SessionMiddlewareStack extends SessionMiddleware {
    private stack: SessionMiddleware[] = []
    private subs = new SubscriptionContainer()

    constructor () {
        super()
        this.push(new SessionMiddleware())
    }

    push (middleware: SessionMiddleware): void {
        this.stack.push(middleware)
        this.relink()
    }

    unshift (middleware: SessionMiddleware): void {
        this.stack.unshift(middleware)
        this.relink()
    }

    remove (middleware: SessionMiddleware): void {
        this.stack = this.stack.filter(m => m !== middleware)
        this.relink()
    }

    replace (middleware: SessionMiddleware, newMiddleware: SessionMiddleware): void {
        const index = this.stack.indexOf(middleware)
        if (index >= 0) {
            this.stack[index].close()
            this.stack[index] = newMiddleware
        } else {
            this.stack.push(newMiddleware)
        }
        this.relink()
    }

    feedFromSession (data: Buffer): void {
        this.stack[0].feedFromSession(data)
    }

    feedFromTerminal (data: Buffer): void {
        this.stack[this.stack.length - 1].feedFromTerminal(data)
    }

    close (): void {
        for (const m of this.stack) {
            m.close()
        }
        this.subs.cancelAll()
        super.close()
    }

    private relink () {
        this.subs.cancelAll()

        for (let i = 0; i < this.stack.length - 1; i++) {
            this.subs.subscribe(
                this.stack[i].outputToTerminal$,
                x => this.stack[i + 1].feedFromSession(x),
            )
        }
        this.subs.subscribe(
            this.stack[this.stack.length - 1].outputToTerminal$,
            x => this.outputToTerminal.next(x),
        )

        for (let i = this.stack.length - 2; i >= 0; i--) {
            this.subs.subscribe(
                this.stack[i + 1].outputToSession$,
                x => this.stack[i].feedFromTerminal(x),
            )
        }
        this.subs.subscribe(
            this.stack[0].outputToSession$,
            x => this.outputToSession.next(x),
        )
    }
}
