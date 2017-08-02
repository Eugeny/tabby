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

hterm.hterm.Terminal.prototype.applyCursorShape = function () {
    let modes = [
        [hterm.hterm.Terminal.cursorShape.BLOCK, true],
        [this.defaultCursorShape || hterm.hterm.Terminal.cursorShape.BLOCK, false],
        [hterm.hterm.Terminal.cursorShape.BLOCK, false],
        [hterm.hterm.Terminal.cursorShape.UNDERLINE, true],
        [hterm.hterm.Terminal.cursorShape.UNDERLINE, false],
        [hterm.hterm.Terminal.cursorShape.BEAM, true],
        [hterm.hterm.Terminal.cursorShape.BEAM, false],
    ]
    let modeNumber = this.cursorMode || 1
    console.log('mode', modeNumber)
    if (modeNumber >= modes.length) {
        console.warn('Unknown cursor style: ' + modeNumber)
        return
    }
    this.setCursorShape(modes[modeNumber][0])
    this.setCursorBlink(modes[modeNumber][1])
}

hterm.hterm.VT.CSI[' q'] = function (parseState) {
    const arg = parseState.args[0]
    this.terminal.cursorMode = arg
    this.terminal.applyCursorShape()
}

const _collapseToEnd = Selection.prototype.collapseToEnd
Selection.prototype.collapseToEnd = function () {
    try {
        _collapseToEnd.apply(this)
    } catch (err) {
        // tslint-disable-line
    }
}
