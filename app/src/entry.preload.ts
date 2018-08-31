import '../lib/lru'
import 'source-sans-pro'
import 'font-awesome/css/font-awesome.css'
import 'ngx-toastr/toastr.css'
import './preload.scss'

import * as Raven from 'raven-js'

const SENTRY_DSN = 'https://4717a0a7ee0b4429bd3a0f06c3d7eec3@sentry.io/181876'

Raven.config(
    SENTRY_DSN,
    {
        release: require('electron').remote.app.getVersion(),
        dataCallback: (data: any) => {
            const normalize = (filename) => {
                let splitArray = filename.split('/')
                return splitArray[splitArray.length - 1]
            }

            data.exception.values[0].stacktrace.frames.forEach(frame => {
                frame.filename = normalize(frame.filename)
            })

            data.culprit = data.exception.values[0].stacktrace.frames[0].filename

            return data
        }
    }
)

process.on('uncaughtException' as any, (err) => {
    Raven.captureException(err)
    console.error(err)
})

const childProcess = require('child_process')
childProcess.spawn = require('electron').remote.require('child_process').spawn
childProcess.exec = require('electron').remote.require('child_process').exec
