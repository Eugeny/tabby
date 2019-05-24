/** @hidden */
module.exports = function patchPTYModule (mod) {
  const oldSpawn = mod.spawn
  if (mod.patched) {
    return
  }
  mod.patched = true
  mod.spawn = (file, args, opt) => {
    let terminal = oldSpawn(file, args, opt)
    let timeout = null
    let buffer = ''
    let lastFlush = 0
    let nextTimeout = 0

    // Minimum prebuffering window (ms) if the input is non-stop flowing
    const minWindow = 10

    // Maximum buffering time (ms) until output must be flushed unconditionally
    const maxWindow = 100

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
            // Taking too much time buffering, flush to keep things interactive
            flush()
        } else {
            if (Date.now() > nextTimeout - (maxWindow / 10)) {
                // Extend the window if it's expiring
                reschedule()
            }
        }
    })
    return terminal
  }
}
