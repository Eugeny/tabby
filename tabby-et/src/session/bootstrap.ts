import { Injector } from '@angular/core'
import * as shellQuote from 'shell-quote'
import { Observable, ReplaySubject } from 'rxjs'
import { ConfigService, Logger, LogService, PartialProfile, ProfilesService } from 'tabby-core'
import { SSHProfile, SSHSession } from 'tabby-ssh'

import { ETProfile } from '../api/interfaces'
import { ET_TERM } from '../protocol/constants'
import { generateBootstrapId, generateBootstrapPasskey } from '../protocol/crypto'
import { redactCredentials } from '../redact'
import { getCaptureLimit } from './captureLimit'

const IDPASSKEY_RE = /IDPASSKEY:([A-Za-z0-9]{16})\/([A-Za-z0-9]{32})/
const BOOTSTRAP_TIMEOUT = 30000

export { DEFAULT_CAPTURE_BYTES, MIN_CAPTURE_BYTES, MAX_CAPTURE_BYTES, getCaptureLimit } from './captureLimit'

export interface ETCredentials {
    id: string
    passkey: string
}

export { redactCredentials } from '../redact'

export class ETBootstrap {
    /**
     * Fires as soon as an SSHSession exists, so the caller can forward its service
     * messages and keyboard-interactive prompts to the UI. ReplaySubject(1) so a late
     * subscriber still sees the current session.
     */
    get sshSessionCreated$ (): Observable<SSHSession> { return this.sshSessionCreated }

    private sshSessionCreated = new ReplaySubject<SSHSession>(1)
    private logger: Logger
    private profiles: ProfilesService
    private config: ConfigService

    constructor (
        private injector: Injector,
        private profile: ETProfile,
    ) {
        this.logger = injector.get(LogService).create('et-bootstrap')
        this.profiles = injector.get(ProfilesService)
        this.config = injector.get(ConfigService)
    }

    /**
     * Run `etterminal` on the remote host over SSH and return the credentials it prints.
     * `dst` is set for the jump-host case, where we bootstrap the jump host with the
     * credentials the destination already gave us.
     */
    async run (options?: { credentials?: ETCredentials, jumpTo?: { host: string, port: number } }): Promise<ETCredentials> {
        const sshProfile = await this.resolveSSHProfile(options?.jumpTo ? 'jump' : 'destination')
        const command = this.buildCommand(sshProfile.options.user, options)

        // Redact: on the jump-host path the command embeds the real id/passkey.
        this.logger.debug(`Bootstrap command: ${redactCredentials(command)}`)

        const session = new SSHSession(this.injector, sshProfile)
        this.sshSessionCreated.next(session)
        try {
            await session.start()
            const output = await this.execAndCapture(session, command, getCaptureLimit(this.profile.options.bootstrapCaptureLimit))
            const match = IDPASSKEY_RE.exec(output.stdout)
            if (!match) {
                throw new Error(this.explainMissingMarker(output))
            }
            return { id: match[1], passkey: match[2] }
        } finally {
            // ET does not need the SSH connection after the bootstrap.
            await session.destroy().catch(() => { /* best effort */ })
        }
    }

    private buildCommand (
        user: string,
        options?: { credentials?: ETCredentials, jumpTo?: { host: string, port: number } },
    ): string {
        // For the destination we send an 'XXX'-prefixed id so etterminal generates its
        // own credentials. For a jump host we must send the REAL credentials the
        // destination gave us, so the jump etserver registers the same key.
        const id = options?.credentials?.id ?? generateBootstrapId()
        const passkey = options?.credentials?.passkey ?? generateBootstrapPasskey()

        // Per-profile path wins, then the global default from Settings (which
        // would otherwise be dead config), then the remote PATH.
        const binary = this.profile.options.etterminalPath
            ?? this.config.store.et.defaultEtterminalPath
            ?? 'etterminal'
        const args = [`--verbose=${this.profile.options.verbose}`]
        if (this.profile.options.serverFifo) {
            args.push(`--serverfifo=${this.profile.options.serverFifo}`)
        }
        if (options?.jumpTo) {
            args.push('--jump', `--dsthost=${options.jumpTo.host}`, `--dstport=${options.jumpTo.port}`)
        }

        // TERM must not contain '_': etterminal splits the line on it.
        const line = `${id}/${passkey}_${ET_TERM}`
        const quoted = shellQuote.quote([binary, ...args])
        let command = `echo '${line}' | ${quoted}`

        if (this.profile.options.killOtherSessions) {
            // user can legitimately be empty ("ask every time") - pkill -u with a
            // null username would kill nothing but looks confusing in logs.
            if (user) {
                command = `pkill etterminal -u ${shellQuote.quote([user])}; sleep 0.5; ${command}`
            }
        }
        return command
    }

    private execAndCapture (session: SSHSession, command: string, captureLimit: number): Promise<{ stdout: string, stderr: string }> {
        return new Promise((resolve, reject) => {
            let stdout = ''
            let stderr = ''
            let settled = false
            let timer: any = null

            const finish = (err?: Error) => {
                if (settled) {
                    return
                }
                settled = true
                if (timer) {
                    clearTimeout(timer)
                }
                if (err) {
                    reject(err)
                } else {
                    resolve({ stdout, stderr })
                }
            }

            timer = setTimeout(
                () => finish(new Error('Timed out waiting for etterminal to start on the remote host')),
                BOOTSTRAP_TIMEOUT,
            )

            void (async () => {
                try {
                    const channel = await session.openExecChannel(command)
                    channel.data$.subscribe(data => {
                        if (stdout.length < captureLimit) {
                            stdout += Buffer.from(data).toString('utf8')
                        }
                        // Resolve as soon as the marker appears - etterminal daemonises and
                        // the channel may stay open briefly afterwards.
                        if (IDPASSKEY_RE.test(stdout)) {
                            finish()
                        }
                    })
                    channel.extendedData$.subscribe(([, data]) => {
                        if (stderr.length < captureLimit) {
                            stderr += Buffer.from(data).toString('utf8')
                        }
                    })
                    channel.closed$.subscribe(() => finish())
                    channel.eof$.subscribe(() => finish())
                } catch (err) {
                    finish(err as Error)
                }
            })()
        })
    }

    private explainMissingMarker (output: { stdout: string, stderr: string }): string {
        const combined = redactCredentials(`${output.stdout}\n${output.stderr}`).trim()
        if (/command not found|No such file or directory|not recognized/i.test(combined)) {
            return 'etterminal was not found on the remote host. Install Eternal Terminal there, '
                + 'or set a custom etterminal path in the profile\'s Advanced tab.'
        }
        if (!combined) {
            return 'The remote host produced no output. Is etterminal installed and is etserver running?'
        }
        return 'Could not read the ET session key from the remote host. Make sure your shell startup '
            + `files do not print anything. Remote output: ${combined.slice(0, 500)}`
    }

    private async resolveSSHProfile (role: 'destination'|'jump'): Promise<SSHProfile> {
        const o = this.profile.options
        const linkedId = role === 'jump' ? o.jumpSshProfile : o.sshProfile
        const host = role === 'jump' ? o.jumpHost! : o.host
        const port = role === 'jump' ? o.jumpSshPort : o.sshPort

        if (linkedId) {
            // MUST be cloned: getProfiles() hands back the objects inside
            // config.store.profiles by reference, and a ConfigProxy setter writes
            // straight through to them. Overriding host/user on a live profile
            // would permanently rewrite the user's saved SSH profile - and, since
            // tabby-ssh looks saved passwords up by profile id, would later offer
            // that profile's password to a different host.
            const all = await this.profiles.getProfiles({ clone: true })
            const found = all.find(x => x.id === linkedId && x.type === 'ssh')
            if (!found) {
                throw new Error(`The linked SSH profile "${linkedId}" no longer exists`)
            }
            const resolved = this.profiles.getConfigProxyForProfile<SSHProfile>(found)
            // The ET profile's host/user win when set, so one SSH profile can serve
            // several ET hosts in the same network.
            if (host) {
                resolved.options.host = host
            }
            if (o.user) {
                resolved.options.user = o.user
            }
            return resolved
        }

        const synthetic: PartialProfile<SSHProfile> = {
            type: 'ssh',
            name: `ET bootstrap for ${host}`,
            options: { host, port, user: o.user },
        }
        // Route through the profile service so global SSH defaults still apply.
        return this.profiles.getConfigProxyForProfile<SSHProfile>(synthetic)
    }
}
