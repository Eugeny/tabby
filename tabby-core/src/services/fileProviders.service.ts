import { Inject, Injectable } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { FileProvider, NotificationsService, SelectorService } from '../api'

@Injectable({ providedIn: 'root' })
export class FileProvidersService {
    /** @hidden */
    private constructor (
        private selector: SelectorService,
        private notifications: NotificationsService,
        private translate: TranslateService,
        @Inject(FileProvider) private fileProviders: FileProvider[],
    ) { }

    async selectAndStoreFile (description: string): Promise<string> {
        return this.selectProvider().then(p => {
            return p.selectAndStoreFile(description)
        })
    }

    async retrieveFile (key: string): Promise<Buffer> {
        for (const p of this.fileProviders) {
            try {
                return await p.retrieveFile(key)
            } catch {
                continue
            }
        }
        throw new Error('Not found')
    }

    async selectProvider (): Promise<FileProvider> {
        const providers: FileProvider[] = []
        await Promise.all(this.fileProviders.map(async p => {
            if (await p.isAvailable()) {
                providers.push(p)
            }
        }))
        if (!providers.length) {
            this.notifications.error(this.translate.instant('Vault master passphrase needs to be set to allow storing secrets'))
            throw new Error('No available file providers')
        }
        if (providers.length === 1) {
            return providers[0]
        }
        return this.selector.show(
            this.translate.instant('Select file storage'),
            providers.map(p => ({
                name: p.name,
                result: p,
            })),
        )
    }
}
