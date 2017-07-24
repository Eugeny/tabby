export const hterm = require('hterm-umdjs')
hterm.hterm.defaultStorage = new hterm.lib.Storage.Memory()
export const preferenceManager = new hterm.hterm.PreferenceManager('default')

hterm.hterm.VT.ESC['k'] = function (parseState) {
    parseState.resetArguments()

    function parseOSC (ps) {
        if (!this.parseUntilStringTerminator_(ps) || ps.func === parseOSC) {
            return
        }

        this.terminal.setWindowTitle(ps.args[0])
    }
    parseState.func = parseOSC
}

preferenceManager.set('background-color', '#1D272D')
preferenceManager.set('color-palette-overrides', {
    0: '#1D272D',
})

hterm.hterm.Terminal.prototype.showOverlay = () => null

hterm.hterm.Terminal.prototype.setCSS = function (css) {
    const doc = this.scrollPort_.document_
    if (!doc.querySelector('#user-css')) {
        const node = doc.createElement('style')
        node.id = 'user-css'
        doc.head.appendChild(node)
    }
    doc.querySelector('#user-css').innerText = css
}

const oldCharWidthDisregardAmbiguous = hterm.lib.wc.charWidthDisregardAmbiguous
hterm.lib.wc.charWidthDisregardAmbiguous = codepoint => {
    if ((codepoint >= 0x1f300 && codepoint <= 0x1f64f) ||
        (codepoint >= 0x1f680 && codepoint <= 0x1f6ff)) {
        return 2
    }
    return oldCharWidthDisregardAmbiguous(codepoint)
}
