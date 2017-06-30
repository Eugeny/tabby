import { Observable } from 'rxjs'
import * as fs from 'fs-promise'
import * as path from 'path'
import { exec } from 'mz/child_process'
const equal = require('deep-equal')
const fontManager = require('font-manager')

import { Component, Inject } from '@angular/core'
import { ConfigService, HostAppService, Platform } from 'terminus-core'
import { TerminalColorSchemeProvider, ITerminalColorScheme } from '../api'

let Registry = null
try {
    Registry = require('winreg')
} catch (_) { } // tslint:disable-line no-empty

interface IShell {
    name: string
    command: string
}

@Component({
    template: require('./terminalSettingsTab.component.pug'),
    styles: [require('./terminalSettingsTab.component.scss')],
})
export class TerminalSettingsTabComponent {
    fonts: string[] = []
    shells: IShell[] = []
    colorSchemes: ITerminalColorScheme[] = []
    equalComparator = equal
    editingColorScheme: ITerminalColorScheme
    schemeChanged = false

    constructor (
        public config: ConfigService,
        private hostApp: HostAppService,
        @Inject(TerminalColorSchemeProvider) private colorSchemeProviders: TerminalColorSchemeProvider[],
    ) { }

    async ngOnInit () {
        if (this.hostApp.platform === Platform.Windows || this.hostApp.platform === Platform.macOS) {
            let fonts = await new Promise<any[]>((resolve) => fontManager.findFonts({ monospace: true }, resolve))
            this.fonts = fonts.map(x => x.family)
            this.fonts.sort()
        }
        if (this.hostApp.platform === Platform.Linux) {
            exec('fc-list :spacing=mono').then(([stdout, _]) => {
                this.fonts = stdout.toString()
                    .split('\n')
                    .filter(x => !!x)
                    .map(x => x.split(':')[1].trim())
                    .map(x => x.split(',')[0].trim())
                this.fonts.sort()
            })
        }
        if (this.hostApp.platform === Platform.Windows) {
            this.shells = [
                { name: 'CMD (clink)', command: '~clink~' },
                { name: 'CMD (stock)', command: 'cmd.exe' },
                { name: 'PowerShell', command: 'powershell.exe' },
            ]

            // Detect whether BoW is installed
            const wslPath = `${process.env.windir}\\system32\\bash.exe`
            if (await fs.exists(wslPath)) {
                this.shells.push({ name: 'Bash on Windows', command: wslPath })
            }

            // Detect Cygwin
            let cygwinPath = await new Promise<string>(resolve => {
                let reg = new Registry({ hive: Registry.HKLM, key: '\\Software\\Cygwin\\setup' })
                reg.get('rootdir', (err, item) => {
                    if (err) {
                        resolve(null)
                        return
                    }
                    resolve(item.value)
                })
            })
            if (cygwinPath) {
                this.shells.push({ name: 'Cygwin', command: path.join(cygwinPath, 'bin', 'bash.exe') })
            }

            // Detect Git-Bash
            let gitBashPath = await new Promise<string>(resolve => {
                let reg = new Registry({ hive: Registry.HKLM, key: '\\Software\\GitForWindows' })
                reg.get('InstallPath', (err, item) => {
                    if (err) {
                        resolve(null)
                        return
                    }
                    resolve(item.value)
                })
            })
            if (gitBashPath) {
                this.shells.push({ name: 'Git-Bash', command: path.join(gitBashPath, 'bin', 'bash.exe') })
            }
        }
        if (this.hostApp.platform === Platform.Linux || this.hostApp.platform === Platform.macOS) {
            this.shells = (await fs.readFile('/etc/shells', 'utf-8'))
                .split('\n')
                .map(x => x.trim())
                .filter(x => x && !x.startsWith('#'))
                .map(x => ({ name: x, command: x }))
        }
        this.colorSchemes = (await Promise.all(this.colorSchemeProviders.map(x => x.getSchemes()))).reduce((a, b) => a.concat(b))
    }

    fontAutocomplete = (text$: Observable<string>) => {
        return text$
          .debounceTime(200)
          .distinctUntilChanged()
          .map(query => this.fonts.filter(v => new RegExp(query, 'gi').test(v)))
          .map(list => Array.from(new Set(list)))
    }

    editScheme (scheme: ITerminalColorScheme) {
        this.editingColorScheme = scheme
        this.schemeChanged = false
    }

    saveScheme () {
        let schemes = this.config.store.terminal.customColorSchemes
        schemes = schemes.filter(x => x !== this.editingColorScheme && x.name !== this.editingColorScheme.name)
        schemes.push(this.editingColorScheme)
        this.config.store.terminal.customColorSchemes = schemes
        this.config.save()
        this.cancelEditing()
    }

    cancelEditing () {
        this.editingColorScheme = null
    }

    deleteScheme (scheme: ITerminalColorScheme) {
        if (confirm(`Delete "${scheme.name}"?`)) {
            let schemes = this.config.store.terminal.customColorSchemes
            schemes = schemes.filter(x => x !== scheme)
            this.config.store.terminal.customColorSchemes = schemes
            this.config.save()
        }
    }

    isCustomScheme (scheme: ITerminalColorScheme) {
        return this.config.store.terminal.customColorSchemes.some(x => equal(x, scheme))
    }

    colorsTrackBy (index) {
        return index
    }
}
