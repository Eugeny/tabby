import type { App } from 'electron'

// Windows groups taskbar buttons, pins and jump lists by AppUserModelID. This must match `appId` in
// electron-builder.yml, which the installer writes into Tabby's shortcuts; unset, Electron generates
// `electron.app.Tabby` on the first jump list update and windows split from the pin. Dev builds
// (`electron app`) keep Electron's default so they don't take over the installed app's pin.
export function applyAppUserModelId (app: Pick<App, 'setAppUserModelId'>, proc: Pick<typeof process, 'platform' | 'defaultApp'>): void {
    if (proc.platform === 'win32' && !proc.defaultApp) {
        app.setAppUserModelId('org.tabby')
    }
}
