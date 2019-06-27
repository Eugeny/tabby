import '../lib/lru'
import 'source-sans-pro/source-sans-pro.css'
import 'source-code-pro/source-code-pro.css'
import '@fortawesome/fontawesome-free/css/solid.css'
import '@fortawesome/fontawesome-free/css/brands.css'
import '@fortawesome/fontawesome-free/css/fontawesome.css'
import 'ngx-toastr/toastr.css'
import './preload.scss'

import * as Raven from 'raven-js'

const SENTRY_DSN = 'https://4717a0a7ee0b4429bd3a0f06c3d7eec3@sentry.io/181876'

Raven.config(
    SENTRY_DSN,
    {
        release: require('electron').remote.app.getVersion(),
        dataCallback: (data: any) => {
            const normalize = (filename: string) => {
                const splitArray = filename.split('/')
                return splitArray[splitArray.length - 1]
            }

            data.exception.values[0].stacktrace.frames.forEach((frame: any) => {
                frame.filename = normalize(frame.filename)
            })

            data.culprit = data.exception.values[0].stacktrace.frames[0].filename

            return data
        },
    },
)

process.on('uncaughtException' as any, (err) => {
    Raven.captureException(err as any)
    console.error(err)
})
