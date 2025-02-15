import * as fs from 'fs/promises'
import * as crypto from 'crypto'
import * as tmp from 'tmp-promise'
import { Injectable } from '@angular/core'
import { ConfigService, FileProvidersService, HostAppService, Platform, PlatformService } from 'tabby-core'
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
        private fileProviders: FileProvidersService,
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
        try {
            if (session.activePrivateKey && session.profile.options.privateKeys && session.profile.options.privateKeys.length > 0) {
                tmpFile = await tmp.file()
                let passphrase: string|null = null
                for (const pk of session.profile.options.privateKeys) {
                    let privateKeyContent: string|null = null
                    const buffer = await this.fileProviders.retrieveFile(pk)
                    privateKeyContent = buffer.toString()
                    await fs.writeFile(tmpFile.path, privateKeyContent)
                    const keyHash = crypto.createHash('sha512').update(privateKeyContent).digest('hex')
                    // need to pass an default passphrase, otherwise it might get stuck at the passphrase input
                    passphrase = await this.passwordStorage.loadPrivateKeyPassword(keyHash) ?? 'tabby'
                    const winSCPcom = path.slice(0, -3) + 'com'
                    try {
                        await this.platform.exec(winSCPcom, ['/keygen', tmpFile.path, '-o', tmpFile.path, '--old-passphrase', passphrase])
                    } catch (error) {
                        console.warn('Could not convert private key ', error)
                        continue
                    }
                    break
                }
                args.push(`/privatekey=${tmpFile.path}`)
                if (passphrase != null) {
                    args.push(`/passphrase=${passphrase}`)
                }
            }
            await this.platform.exec(path, args)
        } finally {
            tmpFile?.cleanup()
        }
    }
}
