import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker'
import { Component, HostBinding } from '@angular/core'
import { ConfigService, HostAppService, Platform, PlatformService, TranslateService, altKeyName, metaKeyName } from 'tabby-core'

/** @hidden */
@Component({
    templateUrl: './terminalSettingsTab.component.pug',
})
export class TerminalSettingsTabComponent {
    Platform = Platform
    altKeyName = altKeyName
    metaKeyName = metaKeyName

    frontendOptions = [
        { value: 'xterm-webgl', name: 'xterm (WebGL)' },
        { value: 'xterm', name: 'xterm (canvas)' },
    ]

    rightClickOptions: { value: any, name: string }[] = []
    linkModifierOptions: { value: any, name: string }[] = []

    @HostBinding('class.content-box') true

    constructor (
        public config: ConfigService,
        public hostApp: HostAppService,
        private platform: PlatformService,
        translate: TranslateService,
    ) {
        this.rightClickOptions = [
            { value: 'off', name: translate.instant(_('Off')) },
            { value: 'menu', name: translate.instant(_('Context menu')) },
            { value: 'paste', name: translate.instant(_('Paste')) },
            { value: 'clipboard', name: translate.instant(_('Paste if no selection, else copy')) },
        ]
        this.linkModifierOptions = [
            { value: null, name: translate.instant(_('No modifier')) },
            { value: 'ctrlKey', name: 'Ctrl' },
            { value: 'altKey', name: altKeyName },
            { value: 'shiftKey', name: 'Shift' },
            { value: 'metaKey', name: metaKeyName },
        ]
        if (hostApp.platform === Platform.macOS) {
            this.linkModifierOptions = this.linkModifierOptions.filter(x => x.value !== 'ctrlKey')
        }
    }

    openWSLVolumeMixer (): void {
        this.platform.openPath('sndvol.exe')
        this.platform.exec('wsl.exe', ['tput', 'bel'])
    }
}
