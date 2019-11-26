const { init } = process.type === 'main' ? require('@sentry/electron/dist/main') : require('@sentry/electron/dist/renderer')


const SENTRY_DSN = 'https://4717a0a7ee0b4429bd3a0f06c3d7eec3@sentry.io/181876'
let release
try {
    release = require('electron').app.getVersion()
} catch {
    release = require('electron').remote.app.getVersion()
}

init({
    dsn: SENTRY_DSN,
    release,
})
