import { Injectable, Injector, NgZone } from '@angular/core'
import { Observable, Subject } from 'rxjs'
import { v4 as uuidv4 } from 'uuid'
import { SubscriptionContainer } from 'tabby-core'
import { BaseTerminalTabComponent, Frontend } from 'tabby-terminal'
import { ElectronService } from './electron.service'
import { RelayFrontend } from '../sessionRelay/relayFrontend'

interface HostedTab {
    relayID: string
    tab: BaseTerminalTabComponent<any>
    frontend: RelayFrontend
    previousFrontend?: Frontend
    subscriptions: SubscriptionContainer
}

/**
 * Keeps terminal sessions that can't leave this window's process (SSH, Telnet,
 * serial) running here while their tab is displayed in another window, and
 * connects tabs displayed here to sessions running in other windows.
 *
 * @hidden
 */
@Injectable({ providedIn: 'root' })
export class SessionRelayService {
    private hostedTabs: HostedTab[] = []
    private pendingConnections = new Map<string, (port: MessagePort|null) => void>()
    private hostGone = new Subject<string>()

    /** Fired with the relay ID when the window running a relayed session has gone away */
    get hostGone$ (): Observable<string> { return this.hostGone }

    private constructor (
        private electron: ElectronService,
        private injector: Injector,
        private zone: NgZone,
    ) {
        electron.ipcRenderer.on('host:session-relay:guest-connected', (event, relayID: string) => {
            this.hostedTabs.find(x => x.relayID === relayID)?.frontend.connect(event.ports[0])
        })

        electron.ipcRenderer.on('host:session-relay:guest-gone', (_$event, relayID: string) => zone.run(() => {
            this.hostedTabs.find(x => x.relayID === relayID)?.tab.destroy()
        }))

        electron.ipcRenderer.on('host:session-relay:connected', (event, relayID: string) => {
            const resolve = this.pendingConnections.get(relayID)
            this.pendingConnections.delete(relayID)
            resolve?.(event.ports[0] ?? null)
        })

        electron.ipcRenderer.on('host:session-relay:host-gone', (_$event, relayID: string) => zone.run(() => {
            this.hostGone.next(relayID)
        }))
    }

    /**
     * Redirects the tab's terminal I/O into a relay that another window can connect to
     *
     * @returns the relay ID and the terminal state the other window should start from
     */
    async startHosting (tab: BaseTerminalTabComponent<any>): Promise<{ relayID: string, savedState: any }> {
        await tab.waitForFrontendWrites()

        const relayID = uuidv4()
        const frontend = new RelayFrontend(this.injector, this.zone)
        // From here on, output is collected for the other window
        const previousFrontend = tab.replaceFrontend(frontend)
        await previousFrontend?.waitForWrites()
        const savedState = previousFrontend?.saveState({ live: true })

        const hosted: HostedTab = {
            relayID,
            tab,
            frontend,
            previousFrontend,
            subscriptions: new SubscriptionContainer(),
        }
        this.hostedTabs.push(hosted)
        hosted.subscriptions.subscribe(frontend.closeRequested$, () => tab.destroy())
        hosted.subscriptions.subscribe(tab.destroyed$, () => this.stopHosting(hosted))

        this.electron.ipcRenderer.send('app:session-relay:register', relayID)
        return { relayID, savedState }
    }

    /**
     * Called once another window has taken the tab over
     */
    finishHandover (tab: BaseTerminalTabComponent<any>): void {
        const hosted = this.hostedTabs.find(x => x.tab === tab)
        if (!hosted) {
            return
        }
        hosted.previousFrontend?.destroy()
        hosted.previousFrontend = undefined
        // The tab isn't shown here anymore and mustn't react to this window's hotkeys
        tab.emitBlurred()
        tab.emitVisibility(false)
    }

    /**
     * Puts the tab back into its previous frontend if the transfer didn't go through
     */
    async cancelHosting (tab: BaseTerminalTabComponent<any>): Promise<void> {
        const hosted = this.hostedTabs.find(x => x.tab === tab)
        if (!hosted?.previousFrontend) {
            return
        }
        await tab.waitForFrontendWrites()
        const previousFrontend = hosted.previousFrontend
        hosted.previousFrontend = undefined
        tab.replaceFrontend(previousFrontend)
        const missedOutput = hosted.frontend.takePendingOutput()
        if (missedOutput) {
            tab.write(missedOutput)
        }
        this.stopHosting(hosted)
        hosted.frontend.destroy()
    }

    /**
     * Connects to a session relayed by another window
     *
     * @returns `null` if the session doesn't exist anymore
     */
    connect (relayID: string): Promise<MessagePort|null> {
        return new Promise(resolve => {
            this.pendingConnections.get(relayID)?.(null)
            this.pendingConnections.set(relayID, resolve)
            this.electron.ipcRenderer.send('app:session-relay:connect', relayID)
        })
    }

    /**
     * Lets go of a relayed session without closing it, e.g. when its tab moves on to another window
     */
    disconnect (relayID: string): void {
        this.electron.ipcRenderer.send('app:session-relay:release', relayID)
    }

    private stopHosting (hosted: HostedTab) {
        if (!this.hostedTabs.includes(hosted)) {
            return
        }
        this.hostedTabs = this.hostedTabs.filter(x => x !== hosted)
        hosted.subscriptions.cancelAll()
        hosted.previousFrontend?.destroy()
        this.electron.ipcRenderer.send('app:session-relay:unregister', hosted.relayID)
    }
}
