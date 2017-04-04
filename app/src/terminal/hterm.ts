const dataurl = require('dataurl')
export const hterm = require('hterm-commonjs')
hterm.hterm.defaultStorage = new hterm.lib.Storage.Memory()
export const preferenceManager = new hterm.hterm.PreferenceManager('default')


hterm.hterm.VT.ESC['k'] = function(parseState) {
    parseState.resetArguments();

    function parseOSC(ps) {
        if (!this.parseUntilStringTerminator_(ps) || ps.func == parseOSC) {
            return
        }

        this.terminal.setWindowTitle(ps.args[0])
    }
    parseState.func = parseOSC
}

preferenceManager.set('user-css', dataurl.convert({
    data: require('./components/terminal.userCSS.scss'),
    mimetype: 'text/css',
    charset: 'utf8',
}))
preferenceManager.set('background-color', '#1D272D')
preferenceManager.set('color-palette-overrides', {
    0: '#1D272D',
})

const oldDecorate = hterm.hterm.ScrollPort.prototype.decorate
hterm.hterm.ScrollPort.prototype.decorate = function (...args) {
    oldDecorate.bind(this)(...args)
    this.screen_.style.cssText += `; padding-right: ${this.screen_.offsetWidth - this.screen_.clientWidth}px;`
}

const oldPaste = hterm.hterm.Terminal.prototype.onPaste_
hterm.hterm.Terminal.prototype.onPaste_ = function (e) {
    e.text = e.text.trim()
    oldPaste.bind(this)(e)
}

hterm.hterm.Terminal.prototype.showOverlay = () => null
