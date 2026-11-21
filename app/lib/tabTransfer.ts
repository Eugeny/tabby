import { ipcMain, MessageChannelMain, Point, Rectangle, screen, WebContents } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import type { Application } from './app'
import type { Window } from './window'

/** How long the sending window waits for the receiving one to take a tab over */
const RECEIVE_TIMEOUT = 30000

interface SessionRelay {
    host: WebContents
    guest: WebContents|null
}

interface PendingDelivery {
    target: WebContents
    resolve: (accepted: boolean) => void
}

/**
 * Places a window of the given size so that the point the user grabbed
 * (relative to the window) ends up under `point`, keeping it on screen
 */
export function placeWindowAt (size: { width: number, height: number }, point: Point, grab: Point): Rectangle {
    const grabX = Math.max(0, Math.min(grab.x, size.width - 20))
    const grabY = Math.max(0, Math.min(grab.y, size.height - 20))
    const workArea = screen.getDisplayNearestPoint(point).workArea
    const x = Math.max(workArea.x, Math.min(Math.round(point.x - grabX), workArea.x + workArea.width - 100))
    const y = Math.max(workArea.y, Math.min(Math.round(point.y - grabY), workArea.y + workArea.height - 100))
    return { x, y, width: size.width, height: size.height }
}

/**
 * Brokers moving tabs between windows.
 *
 * Sessions that live in the main process (local PTYs) are simply reattached
 * by the window that receives the tab. Sessions that live in a window's
 * renderer process (SSH, Telnet, serial) can't leave it - they keep running
 * there and get relayed to the window that now displays them.
 */
export class TabTransferManager {
    private relays = new Map<string, SessionRelay>()
    private pendingDeliveries = new Map<string, PendingDelivery>()
    private watchedContents = new WeakSet<WebContents>()

    init (app: Application): void {
        ipcMain.handle('app:find-window-at', (event, x: number, y: number) => {
            return app.findWindowAt({ x, y }, event.sender)?.webContents.id ?? null
        })

        ipcMain.handle('app:send-tab', async (event, token: any, targetID: number|null, x: number, y: number, grabX: number, grabY: number) => {
            const createWindow = () => {
                const source = app.getWindowByWebContents(event.sender.id)
                const size = source?.getNormalBounds() ?? { width: 800, height: 600 }
                return app.newWindow({ bounds: placeWindowAt(size, { x, y }, { x: grabX, y: grabY }) })
            }
            const target = targetID !== null ? app.getWindowByWebContents(targetID) : await createWindow()
            if (!target || target.isDestroyed()) {
                return false
            }
            const accepted = await this.deliverTab(target, token, { x, y })
            if (accepted) {
                target.present()
            }
            return accepted
        })

        ipcMain.on('app:receive-tab-result', (event, requestID: string, accepted: boolean) => {
            if (this.pendingDeliveries.get(requestID)?.target === event.sender) {
                this.settleDelivery(requestID, !!accepted)
            }
        })

        ipcMain.on('app:session-relay:register', (event, relayID: string) => {
            this.watch(event.sender)
            this.relays.set(relayID, { host: event.sender, guest: null })
        })

        ipcMain.on('app:session-relay:unregister', (event, relayID: string) => {
            const relay = this.relays.get(relayID)
            if (relay?.host !== event.sender) {
                return
            }
            this.relays.delete(relayID)
            app.onSessionRelayRemoved(relay.host)
        })

        ipcMain.on('app:session-relay:connect', (event, relayID: string) => {
            const relay = this.relays.get(relayID)
            if (!relay || relay.host.isDestroyed()) {
                event.sender.send('host:session-relay:connected', relayID)
                return
            }
            this.watch(event.sender)
            relay.guest = event.sender
            const { port1, port2 } = new MessageChannelMain()
            relay.host.postMessage('host:session-relay:guest-connected', relayID, [port1])
            event.sender.postMessage('host:session-relay:connected', relayID, [port2])
        })

        ipcMain.on('app:session-relay:release', (event, relayID: string) => {
            const relay = this.relays.get(relayID)
            if (relay?.guest === event.sender) {
                relay.guest = null
            }
        })
    }

    /**
     * Whether the window still runs sessions displayed in other windows
     */
    isHostingSessions (contents: WebContents): boolean {
        return [...this.relays.values()].some(relay => relay.host === contents)
    }

    private deliverTab (target: Window, token: any, point: Point): Promise<boolean> {
        const requestID = uuidv4()
        return new Promise(resolve => {
            const timeout = setTimeout(() => this.settleDelivery(requestID, false), RECEIVE_TIMEOUT)
            this.pendingDeliveries.set(requestID, {
                target: target.webContents,
                resolve: accepted => {
                    clearTimeout(timeout)
                    resolve(accepted)
                },
            })
            target.send('host:receive-tab', requestID, token, point.x, point.y)
        })
    }

    private settleDelivery (requestID: string, accepted: boolean) {
        const delivery = this.pendingDeliveries.get(requestID)
        this.pendingDeliveries.delete(requestID)
        delivery?.resolve(accepted)
    }

    private watch (contents: WebContents) {
        if (this.watchedContents.has(contents)) {
            return
        }
        this.watchedContents.add(contents)
        contents.once('destroyed', () => {
            for (const [relayID, relay] of this.relays.entries()) {
                if (relay.host === contents) {
                    this.relays.delete(relayID)
                    if (relay.guest && !relay.guest.isDestroyed()) {
                        relay.guest.send('host:session-relay:host-gone', relayID)
                    }
                } else if (relay.guest === contents) {
                    relay.guest = null
                    if (!relay.host.isDestroyed()) {
                        relay.host.send('host:session-relay:guest-gone', relayID)
                    }
                }
            }
        })
    }
}
