/* eslint-disable @typescript-eslint/no-empty-function */
import { Injector, NgZone } from '@angular/core'
import * as path from 'path'
import { BaseSession } from 'tabby-terminal'
import { Logger } from 'tabby-core'

const currentScript: any = document.currentScript

export class Session extends BaseSession {
    private dataPath = window['tabbyWebDemoDataPath'] ?? currentScript.src + '../../../data'
    private vm: any
    private zone: NgZone
    static v86Loaded = false

    constructor (
        injector: Injector,
        logger: Logger,
    ) {
        super(logger)
        this.zone = injector.get(NgZone)
    }

    async start (): Promise<void> {
        this.open = true
        this.emitMessage('Hey\r\n')

        if (!Session.v86Loaded) {
            await new Promise<void>(resolve => {
                const script = document.createElement('script')
                script.onload = () => {
                    resolve()
                    Session.v86Loaded = true
                }
                script.src = `${this.dataPath}/v86_all.js`
                document.querySelector('head')?.appendChild(script)
            })
        }

        this.zone.runOutsideAngular(() => {
            this.vm = new window['V86Starter']({
                bios: {
                    url: `${this.dataPath}/bios.bin`,
                },
                vga_bios: {
                    url: `${this.dataPath}/vgabios.bin`,
                },
                wasm_path: `${this.dataPath}/v86.wasm`,
                cdrom: {
                    url: `${this.dataPath}/linux.iso`,
                },
                initial_state: {
                    url: `${this.dataPath}/v86state.bin`,
                },
                autostart: true,
                disable_keyboard: true,
                disable_speaker: true,
            })
        })

        this.vm.add_listener('emulator-ready', () => {
            this.emitMessage('\r\nVM ready, booting\r\n')
            setTimeout(() => {
                this.emitMessage('[Yes, this is a real demo]\r\n')
            }, 2000)
        })
        this.vm.add_listener('download-progress', (e) => {
            this.emitMessage(`\rDownloading ${path.basename(e.file_name)}: ${e.loaded / 1024}/${e.total / 1024} kB         `)
        })
        this.vm.add_listener('download-error', (e) => {
            this.emitMessage(`\r\nDownload error: ${e}\r\n`)
        })

        this.vm.add_listener('serial0-output-char', char => {
            this.emitOutput(Buffer.from(char))
        })
    }

    resize (_columns: number, _rows: number): void { }

    write (data: Buffer): void {
        this.vm.serial0_send(data.toString())
    }

    kill (_signal?: string): void {
    }

    emitMessage (msg: string): void {
        this.emitOutput(Buffer.from(msg))
    }

    async gracefullyKillProcess (): Promise<void> { }

    supportsWorkingDirectory (): boolean {
        return false
    }

    async getWorkingDirectory (): Promise<string | null> {
        return null
    }
}
