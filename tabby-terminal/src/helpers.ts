import { TerminalColorScheme } from './api/interfaces'
import { ConfigService, ThemesService } from 'tabby-core'

export function getTerminalBackgroundColor (
    config: ConfigService,
    themes: ThemesService,
    scheme?: TerminalColorScheme,
): string|null {
    const appTheme = themes.findCurrentTheme()
    const appColorScheme = themes._getActiveColorScheme() as TerminalColorScheme

    // Use non transparent background when:
    // - legacy theme and user choses colorScheme based BG
    // - or new theme but profile-specific scheme is used
    const shouldUseCSBackground =
        !appTheme.followsColorScheme && config.store.terminal.background === 'colorScheme'
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        || appTheme.followsColorScheme && scheme?.name !== appColorScheme.name

    return shouldUseCSBackground && scheme ? scheme.background : null
}
