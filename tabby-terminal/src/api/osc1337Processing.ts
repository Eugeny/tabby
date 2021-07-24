import * as os from 'os'
import { Subject, Observable } from 'rxjs'

const OSC1337Prefix = Buffer.from('\x1b]1337;')
const OSC1337Suffix = Buffer.from('\x07')

export class OSC1337Processor {
    get cwdReported$ (): Observable<string> { return this.cwdReported }

    private cwdReported = new Subject<string>()

    process (data: Buffer): Buffer {
        if (data.includes(OSC1337Prefix)) {
            const preData = data.subarray(0, data.indexOf(OSC1337Prefix))
            const params = data.subarray(data.indexOf(OSC1337Prefix) + OSC1337Prefix.length)
            const postData = params.subarray(params.indexOf(OSC1337Suffix) + OSC1337Suffix.length)
            const paramString = params.subarray(0, params.indexOf(OSC1337Suffix)).toString()

            if (paramString.startsWith('CurrentDir=')) {
                let reportedCWD = paramString.split('=')[1]
                if (reportedCWD.startsWith('~')) {
                    reportedCWD = os.homedir() + reportedCWD.substring(1)
                }
                this.cwdReported.next(reportedCWD)
            } else {
                console.debug('Unsupported OSC 1337 parameter:', paramString)
            }

            data = Buffer.concat([preData, postData])
        }
        return data
    }

    close (): void {
        this.cwdReported.complete()
    }
}
