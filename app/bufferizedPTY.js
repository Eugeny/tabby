module.exports = function patchPTYModule (path) {
  const mod = require(path)
  const oldSpawn = mod.spawn
  if (mod.patched) {
    return mod
  }
  mod.patched = true
  mod.spawn = (file, args, opt) => {
    let terminal = oldSpawn(file, args, opt)
    let timeout = null
    let buffer = ''
    let lastFlush = 0
    let nextTimeout = 0

    const maxWindow = 250
    const minWindow = 50

    function flush () {
        if (buffer) {
            terminal.emit('data-buffered', buffer)
        }
        lastFlush = Date.now()
        buffer = ''
    }

    function reschedule () {
        if (timeout) {
            clearTimeout(timeout)
        }
        nextTimeout = Date.now() + minWindow
        timeout = setTimeout(() => {
            timeout = null
            flush()
        }, minWindow)
    }

    terminal.on('data', data => {
        buffer += data
        if (Date.now() - lastFlush > maxWindow) {
            flush()
        } else {
            if (Date.now() > nextTimeout - (minWindow / 10)) {
                reschedule()
            }
        }
    })
    return terminal
  }
  return mod
}
