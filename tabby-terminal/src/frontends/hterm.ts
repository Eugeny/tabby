/* eslint-disable */

/** @hidden */
export const hterm = require('hterm-umdjs')

hterm.hterm.defaultStorage = new hterm.lib.Storage.Memory()

/** @hidden */
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
    const modes = [
        [hterm.hterm.Terminal.cursorShape.BLOCK, true],
        [this.defaultCursorShape || hterm.hterm.Terminal.cursorShape.BLOCK, false],
        [hterm.hterm.Terminal.cursorShape.BLOCK, false],
        [hterm.hterm.Terminal.cursorShape.UNDERLINE, true],
        [hterm.hterm.Terminal.cursorShape.UNDERLINE, false],
        [hterm.hterm.Terminal.cursorShape.BEAM, true],
        [hterm.hterm.Terminal.cursorShape.BEAM, false],
    ]
    const modeNumber = this.cursorMode || 1
    if (modeNumber >= modes.length) {
        console.warn('Unknown cursor style: ' + modeNumber)
        return
    }
    setTimeout(() => {
        this.setCursorShape(modes[modeNumber][0])
        this.setCursorBlink(modes[modeNumber][1])
    })
    setTimeout(() => {
        this.setCursorVisible(true)
    })
}

hterm.hterm.VT.CSI[' q'] = function (parseState) {
    const arg = parseState.args[0]
    this.terminal.cursorMode = arg
    this.terminal.applyCursorShape()
}

hterm.hterm.VT.OSC['4'] = function (parseState) {
    const args: string[] = parseState.args[0].split(';')

    const pairCount = args.length / 2
    const colorPalette = this.terminal.getTextAttributes().colorPalette
    const responseArray: string[] = []

    for (let pairNumber = 0; pairNumber < pairCount; ++pairNumber) {
        const colorIndex = parseInt(args[pairNumber * 2])
        let colorValue = args[pairNumber * 2 + 1]

        if (colorIndex >= colorPalette.length) {
            continue
        }

        if (colorValue === '?') {
            colorValue = hterm.lib.colors.rgbToX11(colorPalette[colorIndex])
            if (colorValue) {
                responseArray.push(colorIndex.toString() + ';' + colorValue)
            }
            continue
        }

        colorValue = hterm.lib.colors.x11ToCSS(colorValue)
        if (colorValue) {
            this.terminal.colorPaletteOverrides[colorIndex] = colorValue
            colorPalette[colorIndex] = colorValue
        }
    }

    if (responseArray.length) {
        this.terminal.io.sendString('\x1b]4;' + responseArray.join(';') + '\x07')
    }
}

const _collapseToEnd = Selection.prototype.collapseToEnd
Selection.prototype.collapseToEnd = function () {
    try {
        _collapseToEnd.apply(this)
    } catch (e) { }
}
