import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getTerminalBackgroundColor, getXtermBackgroundColor } from '../src/helpers.ts'

const profileScheme = {
    name: 'Profile scheme',
    background: '#112233',
    foreground: '#ffffff',
} as any
const appScheme = {
    name: 'App scheme',
    background: '#010203',
    foreground: '#ffffff',
} as any

function config (appearance: any): any {
    return { store: { appearance, terminal: { background: 'theme' } } }
}

const themes = {
    findCurrentTheme: () => ({ followsColorScheme: true, terminalBackground: '#0a0a0a' }),
    _getActiveColorScheme: () => appScheme,
} as any

describe('profile color scheme on a transparent window', () => {
    it('uses the scheme background when the window is opaque', () => {
        const opaque = config({ vibrancy: false, opacity: 1 })
        assert.equal(getTerminalBackgroundColor(opaque, themes, profileScheme), '#112233')
        assert.equal(getXtermBackgroundColor(opaque, themes, profileScheme), '#112233')
    })

    it('keeps the surface transparent with Acrylic enabled', () => {
        const acrylic = config({ vibrancy: true, opacity: 1 })
        assert.equal(getTerminalBackgroundColor(acrylic, themes, profileScheme), null)
        assert.equal(getXtermBackgroundColor(acrylic, themes, profileScheme), '#00000000')
    })

    it('inherits window opacity below 100%', () => {
        const translucent = config({ vibrancy: false, opacity: 0.7 })
        assert.equal(getTerminalBackgroundColor(translucent, themes, profileScheme), null)
        assert.equal(getXtermBackgroundColor(translucent, themes, profileScheme), '#00000000')
    })

    it('leaves the default profile appearance unchanged', () => {
        const opaque = config({ vibrancy: false, opacity: 1 })
        assert.equal(getTerminalBackgroundColor(opaque, themes, null), null)
        assert.equal(getXtermBackgroundColor(opaque, themes, null), '#010203')
    })
})
