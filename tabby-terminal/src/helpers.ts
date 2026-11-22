import { ConfigService, ThemesService, Theme, TerminalColorScheme } from 'tabby-core'

function getActiveTerminalTheme (
    themes: ThemesService,
): { appTheme: Theme, appColorScheme: TerminalColorScheme } {
    const appTheme = themes.findCurrentTheme()
    const appColorScheme = themes._getActiveColorScheme()

    return { appTheme, appColorScheme }
}

/** Whether the window itself is see-through (Acrylic/vibrancy or opacity below 100%). */
function isWindowTransparent (config: ConfigService): boolean {
    const appearance = config.store?.appearance
    return !!appearance?.vibrancy || (appearance?.opacity ?? 1) < 1
}

export function getTerminalBackgroundColor (
    config: ConfigService,
    themes: ThemesService,
    scheme: TerminalColorScheme | null,
): string|null {
    // A profile with a custom color scheme must not paint an opaque surface
    // over a transparent window, otherwise its opacity effectively doesn't
    // carry over from the Window settings.
    if (isWindowTransparent(config)) {
        return null
    }

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
    // Keep the terminal surface transparent when the window is translucent so
    // the OS blur / window opacity is visible inside the terminal area too,
    // even for profiles with their own color scheme.
    if (isWindowTransparent(config)) {
        return '#00000000'
    }

    const configuredBackground = getTerminalBackgroundColor(config, themes, scheme)
    if (configuredBackground) {
        return configuredBackground
    }

    const { appTheme, appColorScheme } = getActiveTerminalTheme(themes)
    return appTheme.followsColorScheme ? appColorScheme.background : appTheme.terminalBackground
}
