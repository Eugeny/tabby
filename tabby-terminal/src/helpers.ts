import { ConfigService, ThemesService, Theme, TerminalColorScheme } from 'tabby-core'

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

    const { appTheme, appColorScheme } = getActiveTerminalTheme(themes)
    return appTheme.followsColorScheme ? appColorScheme.background : appTheme.terminalBackground
}
