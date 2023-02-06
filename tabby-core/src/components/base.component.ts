import { Observable, Subscription, Subject } from 'rxjs'

interface CancellableEvent {
    element: HTMLElement
    event: string
    handler: EventListenerOrEventListenerObject
    options?: boolean|AddEventListenerOptions
}

export class SubscriptionContainer {
    private subscriptions: Subscription[] = []
    private events: CancellableEvent[] = []

    isEmpty (): boolean {
        return this.events.length === 0 && this.subscriptions.length === 0
    }

    addEventListener (element: HTMLElement, event: string, handler: EventListenerOrEventListenerObject, options?: boolean|AddEventListenerOptions): void {
        element.addEventListener(event, handler, options)
        this.events.push({
            element,
            event,
            handler,
            options,
        })
    }

    subscribe <T> (observable: Observable<T>, handler: (v: T) => void): void {
        this.subscriptions.push(observable.subscribe(handler))
    }

    cancelAll (): void {
        for (const s of this.subscriptions) {
            s.unsubscribe()
        }
        for (const e of this.events) {
            e.element.removeEventListener(e.event, e.handler, e.options)
        }
        this.subscriptions = []
        this.events = []
    }
}

export class BaseComponent {
    protected get destroyed$ (): Observable<void> { return this._destroyed }
    private _destroyed = new Subject<void>()
    private _subscriptionContainer = new SubscriptionContainer()

    addEventListenerUntilDestroyed (element: HTMLElement, event: string, handler: EventListenerOrEventListenerObject, options?: boolean|AddEventListenerOptions): void {
        this._subscriptionContainer.addEventListener(element, event, handler, options)
    }

    subscribeUntilDestroyed <T> (observable: Observable<T>, handler: (v: T) => void): void {
        this._subscriptionContainer.subscribe(observable, handler)
    }

    ngOnDestroy (): void {
        this._destroyed.next()
        this._destroyed.complete()
        this._subscriptionContainer.cancelAll()
    }
}
