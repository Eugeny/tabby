// import * as fs from 'fs/promises'
import * as tmp from 'tmp-promise'
import { Injectable } from '@angular/core'
import { ConfigService, HostAppService, Platform, PlatformService } from 'tabby-core'
import { SSHSession } from '../session/ssh'
import { SSHProfile } from '../api'
import { PasswordStorageService } from './passwordStorage.service'

@Injectable({ providedIn: 'root' })
export class SSHService {
    private detectedWinSCPPath: string | null

    private constructor (
        private passwordStorage: PasswordStorageService,
        private config: ConfigService,
        hostApp: HostAppService,
        private platform: PlatformService,
    ) {
        if (hostApp.platform === Platform.Windows) {
            this.detectedWinSCPPath = platform.getWinSCPPath()
        }
    }

    getWinSCPPath (): string|undefined {
        return this.detectedWinSCPPath ?? this.config.store.ssh.winSCPPath
    }

    async getWinSCPURI (profile: SSHProfile, cwd?: string, username?: string): Promise<string> {
        let uri = `scp://${username ?? profile.options.user}`
        const password = await this.passwordStorage.loadPassword(profile)
        if (password) {
            uri += ':' + encodeURIComponent(password)
        }
        if (profile.options.host.includes(':')) {
            uri += `@[${profile.options.host}]:${profile.options.port}${cwd ?? '/'}`
        }else {
            uri += `@${profile.options.host}:${profile.options.port}${cwd ?? '/'}`
        }
        return uri
    }

    async launchWinSCP (session: SSHSession): Promise<void> {
        const path = this.getWinSCPPath()
        if (!path) {
            return
        }
        const args = [await this.getWinSCPURI(session.profile, undefined, session.authUsername ?? undefined)]

        let tmpFile: tmp.FileResult|null = null
        if (session.activePrivateKey) {
            tmpFile = await tmp.file()
            // await fs.writeFile(tmpFile.path, session.activePrivateKey)
            const winSCPcom = path.slice(0, -3) + 'com'
            await this.platform.exec(winSCPcom, ['/keygen', tmpFile.path, `/output=${tmpFile.path}`])
            args.push(`/privatekey=${tmpFile.path}`)
        }
        await this.platform.exec(path, args)
        tmpFile?.cleanup()
    }
}
