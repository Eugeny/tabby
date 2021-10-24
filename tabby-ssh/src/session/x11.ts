import { Socket, SocketConnectOpts } from 'net'
import { Subject } from 'rxjs'

export class X11Socket {
    error$ = new Subject<Error>()
    private socket: Socket | null = null

    static resolveDisplaySpec (spec?: string|null): SocketConnectOpts {
        // eslint-disable-next-line prefer-const
        let [xHost, xDisplay] = /^(.+):(\d+)(?:.(\d+))$/.exec(spec ?? process.env.DISPLAY ?? 'localhost:0') ?? []
        if (process.platform === 'win32') {
            xHost ??= 'localhost'
        } else {
            xHost ??= 'unix'
        }

        if (spec?.startsWith('/')) {
            xHost = spec
        }

        const display = parseInt(xDisplay || '0')
        const port = display < 100 ? display + 6000 : display

        if (xHost === 'unix') {
            xHost = `/tmp/.X11-unix/X${display}`
        }

        if (xHost.startsWith('/')) {
            return {
                path: xHost,
            }
        } else {
            return {
                host: xHost,
                port: port,
            }
        }
    }

    connect (spec: string): Promise<Socket> {
        this.socket = new Socket()
        return new Promise((resolve, reject) => {
            this.socket!.on('connect', () => {
                resolve(this.socket!)
            })
            this.socket!.on('error', e => {
                this.error$.next(e)
                reject(e)
            })
            this.socket!.connect(X11Socket.resolveDisplaySpec(spec))
        })
    }

    destroy (): void {
        this.socket?.destroy()
    }
}
