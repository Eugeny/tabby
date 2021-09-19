import * as os from 'os'
import { Subject, Observable } from 'rxjs'

const OSCPrefix = Buffer.from('\x1b]')
const OSCSuffix = Buffer.from('\x07')

export class OSCProcessor {
    get cwdReported$ (): Observable<string> { return this.cwdReported }
    get copyRequested$ (): Observable<string> { return this.copyRequested }

    private cwdReported = new Subject<string>()
    private copyRequested = new Subject<string>()

    process (data: Buffer): Buffer {
        let startIndex = 0
        while (data.includes(OSCPrefix, startIndex) && data.includes(OSCSuffix, startIndex)) {
            const params = data.subarray(data.indexOf(OSCPrefix, startIndex) + OSCPrefix.length)
            const oscString = params.subarray(0, params.indexOf(OSCSuffix)).toString()

            startIndex = data.indexOf(OSCSuffix, startIndex) + OSCSuffix.length

            const [oscCodeString, ...oscParams] = oscString.split(';')
            const oscCode = parseInt(oscCodeString)

            if (oscCode === 1337) {
                const paramString = oscParams.join(';')
                if (paramString.startsWith('CurrentDir=')) {
                    let reportedCWD = paramString.split('=')[1]
                    if (reportedCWD.startsWith('~')) {
                        reportedCWD = os.homedir() + reportedCWD.substring(1)
                    }
                    this.cwdReported.next(reportedCWD)
                } else {
                    console.debug('Unsupported OSC 1337 parameter:', paramString)
                }
            } else if (oscCode === 52) {
                if (oscParams[0] === 'c') {
                    const content = Buffer.from(oscParams[1], 'base64')
                    this.copyRequested.next(content.toString())
                }
            } else {
                continue
            }
        }
        return data
    }

    close (): void {
        this.cwdReported.complete()
    }
}
