import { Component, HostBinding } from '@angular/core'
import { ConfigService, HostAppService, Platform, PlatformService, altKeyName, metaKeyName } from 'tabby-core'

/** @hidden */
@Component({
    templateUrl: './terminalSettingsTab.component.pug',
})
export class TerminalSettingsTabComponent {
    Platform = Platform
    altKeyName = altKeyName
    metaKeyName = metaKeyName

    @HostBinding('class.content-box') true

    constructor (
        public config: ConfigService,
        public hostApp: HostAppService,
        private platform: PlatformService,
    ) { }

    async onBellSoundSelected (event: Event): Promise<void> {
        const input = event.target as HTMLInputElement
        const file = input.files?.[0]
        if (!file) {
            return
        }
        const dataURL = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(file)
        })
        this.config.store.terminal.bellSound = dataURL
        this.config.save()
        input.value = ''
    }

    openWSLVolumeMixer (): void {
        this.platform.openPath('sndvol.exe')
        this.platform.exec('wsl.exe', ['tput', 'bel'])
    }
}
