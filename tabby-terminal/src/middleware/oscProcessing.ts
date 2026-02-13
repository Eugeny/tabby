import * as os from 'os'
import { Subject, Observable } from 'rxjs'
import { SessionMiddleware } from '../api/middleware'

const OSCPrefix = Buffer.from('\x1b]')
const OSCSuffixes = [Buffer.from('\x07'), Buffer.from('\x1b\\')]

export class OSCProcessor extends SessionMiddleware {
    get cwdReported$ (): Observable<string> { return this.cwdReported }

    private cwdReported = new Subject<string>()
    private pendingOSC: Buffer|null = null

    feedFromSession (data: Buffer): void {
        if (this.pendingOSC) {
            data = Buffer.concat([this.pendingOSC, data])
            this.pendingOSC = null
        }

        let passthrough = data
        let searchIndex = 0

        while (true) {
            const prefixIndex = data.indexOf(OSCPrefix, searchIndex)
            if (prefixIndex === -1) {
                break
            }

            const contentStart = prefixIndex + OSCPrefix.length
            const suffixes = OSCSuffixes
                .map((suffix): [Buffer, number] => [suffix, data.indexOf(suffix, contentStart)])
                .filter(([_, index]) => index !== -1)
                .sort(([_, a], [__, b]) => a - b)

            if (!suffixes.length) {
                this.pendingOSC = data.subarray(prefixIndex)
                passthrough = data.subarray(0, prefixIndex)
                break
            }

            const [closestSuffix, closestSuffixIndex] = suffixes[0]
            const oscString = data.subarray(contentStart, closestSuffixIndex).toString()
            searchIndex = closestSuffixIndex + closestSuffix.length

            const [oscCodeString, ...oscParams] = oscString.split(';')
            const oscCode = parseInt(oscCodeString)
            if (oscCode !== 1337) {
                continue
            }

            const paramString = oscParams.join(';')
            if (!paramString.startsWith('CurrentDir=')) {
                console.debug('Unsupported OSC 1337 parameter:', paramString)
                continue
            }

            const equalsIndex = paramString.indexOf('=')
            let reportedCWD = equalsIndex === -1 ? '' : paramString.substring(equalsIndex + 1)
            if (reportedCWD.startsWith('~')) {
                reportedCWD = os.homedir() + reportedCWD.substring(1)
            }
            this.cwdReported.next(reportedCWD)
        }

        super.feedFromSession(passthrough)
    }

    close (): void {
        this.cwdReported.complete()
        super.close()
    }
}
