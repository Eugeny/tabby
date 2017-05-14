const dataurl = require('dataurl')
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

preferenceManager.set('user-css', dataurl.convert({
    data: require('./hterm.userCSS.scss'),
    mimetype: 'text/css',
    charset: 'utf8',
}))
preferenceManager.set('background-color', '#1D272D')
preferenceManager.set('color-palette-overrides', {
    0: '#1D272D',
})

hterm.hterm.Terminal.prototype.showOverlay = () => null
