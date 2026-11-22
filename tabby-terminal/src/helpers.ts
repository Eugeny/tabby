import { ConfigService, ThemesService, Theme, TerminalColorScheme } from 'tabby-core'

/** Returns the profile's right-click override, or the global setting when it is unset. */
export function getRightClickBehavior (
    override: string|null|undefined,
    globalBehavior: string,
): string {
    return override ?? globalBehavior
}

function getActiveTerminalTheme (
    themes: ThemesService,
): { appTheme: Theme, appColorScheme: TerminalColorScheme } {
    const appTheme = themes.findCurrentTheme()
    const appColorScheme = themes._getActiveColorScheme()

    return { appTheme, appColorScheme }
}

export function getTerminalBackgroundColor (
    config: ConfigService,
    themes: ThemesService,
    scheme: TerminalColorScheme | null,
): string|null {
    const { appTheme, appColorScheme } = getActiveTerminalTheme(themes)

    // Use non transparent background when:
    // - legacy theme and user choses colorScheme based BG
    // - or new theme but profile-specific scheme is used
    const shouldUseCSBackground =
        !appTheme.followsColorScheme && config.store.terminal.background === 'colorScheme'
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        || appTheme.followsColorScheme && scheme?.name !== appColorScheme.name

    return shouldUseCSBackground && scheme ? scheme.background : null
}

export function getXtermBackgroundColor (
    config: ConfigService,
    themes: ThemesService,
    scheme: TerminalColorScheme | null,
): string {
    const configuredBackground = getTerminalBackgroundColor(config, themes, scheme)
    if (configuredBackground) {
        return configuredBackground
    }

    // Keep terminal surface transparent when window vibrancy is enabled,
    // so the OS acrylic/blur effect is visible inside the terminal area too.
    if (config.store.appearance?.vibrancy) {
        return '#00000000'
    }

    const { appTheme, appColorScheme } = getActiveTerminalTheme(themes)
    return appTheme.followsColorScheme ? appColorScheme.background : appTheme.terminalBackground
}
