import * as os from 'os'
import { Subject, Observable } from 'rxjs'
import { SessionMiddleware } from '../api/middleware'

const OSCPrefix = Buffer.from('\x1b]')
const OSCSuffixes = [Buffer.from('\x07'), Buffer.from('\x1b\\')]

export class OSCProcessor extends SessionMiddleware {
    get cwdReported$ (): Observable<string> { return this.cwdReported }
    get copyRequested$ (): Observable<string> { return this.copyRequested }

    private cwdReported = new Subject<string>()
    private copyRequested = new Subject<string>()

    feedFromSession (data: Buffer): void {
        let startIndex = 0
        while (data.includes(OSCPrefix, startIndex)) {
            const si = startIndex
            if (!OSCSuffixes.some(s => data.includes(s, si))) {
                break
            }

            const params = data.subarray(data.indexOf(OSCPrefix, startIndex) + OSCPrefix.length)

            const [closesSuffix, closestSuffixIndex] = OSCSuffixes
                .map((suffix): [Buffer, number] => [suffix, params.indexOf(suffix)])
                .filter(([_, index]) => index !== -1)
                .sort(([_, a], [__, b]) => a - b)[0]

            const oscString = params.subarray(0, closestSuffixIndex).toString()

            startIndex = data.indexOf(closesSuffix, startIndex) + closesSuffix.length

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
                if (oscParams[0] === 'c' || oscParams[0] === '') {
                    const content = Buffer.from(oscParams[1], 'base64')
                    this.copyRequested.next(content.toString())
                }
            } else {
                continue
            }
        }
        super.feedFromSession(data)
    }

    close (): void {
        this.cwdReported.complete()
        this.copyRequested.complete()
        super.close()
    }
}
