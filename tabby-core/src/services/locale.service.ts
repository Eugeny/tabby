import { Injectable } from '@angular/core'
import { registerLocaleData } from '@angular/common'
import { TranslateService } from '@ngx-translate/core'

import localeEN from '@angular/common/locales/en-GB'
import localeRU from '@angular/common/locales/ru'
import { Observable, Subject } from 'rxjs'
import { distinctUntilChanged } from 'rxjs/operators'
import { ConfigService } from './config.service'
import { LogService, Logger } from './log.service'

registerLocaleData(localeEN)
registerLocaleData(localeRU)

@Injectable({ providedIn: 'root' })
export class TranslateServiceWrapper extends TranslateService {
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    getParsedResult (translations: any, key: any, interpolateParams?: any): any {
        this.translations[this.defaultLang][key] ??= this.compiler.compile(key, this.defaultLang)
        return super.getParsedResult(translations, key, interpolateParams)
    }
}

@Injectable({ providedIn: 'root' })
export class LocaleService {
    private logger: Logger

    static readonly allLocales = ['en', 'de', 'fr', 'ru']

    get localeChanged$ (): Observable<string> {
        return this.localeChanged.pipe(distinctUntilChanged())
    }

    get catalogChanged$ (): Observable<Record<string, string | undefined>> {
        return this.catalogChanged.pipe(distinctUntilChanged())
    }

    readonly allLanguages: { code: string, name: string }[]
    private translations = {
        en: {
            Close: 'Close',
        },
        ru: {
            Close: 'Закрыть',
        },
    }
    private locale = 'en'
    private localeChanged = new Subject<string>()
    private catalogChanged = new Subject<Record<string, string | undefined>>()

    constructor (
        private config: ConfigService,
        private translate: TranslateService,
        log: LogService,
    ) {
        this.logger = log.create('translate')
        config.changed$.subscribe(() => {
            this.refresh()
        })
        this.refresh()

        this.allLanguages = [
            {
                code: 'en',
                name: translate.instant('English'),
            },
            {
                code: 'de',
                name: translate.instant('German'),
            },
            {
                code: 'fr',
                name: translate.instant('French'),
            },
            /* {
                code: 'it',
                name: translate.instant('Italian'),
            },
            {
                code: 'es',
                name: translate.instant('Spanish'),
            }, */
            {
                code: 'ru',
                name: translate.instant('Russian'),
            },
            /* {
                code: 'ar',
                name: translate.instant('Arabic'),
            }, */
        ]
    }

    refresh (): void {
        this.setLocale(this.config.store.language)
    }

    async setLocale (lang: string): Promise<void> {
        const strings = this.translations[lang]

        if (!this.translate.langs.includes(lang)) {
            this.translate.addLangs([lang])

            // Filter out legacy interpolated strings
            const filteredStrings = Object.fromEntries(
                Object.entries(strings).filter(e => !e[0].includes('{{')),
            )
            this.translate.setTranslation(lang, filteredStrings)
        }

        this.translate.setDefaultLang(lang)

        this.locale = lang
        this.localeChanged.next(lang)
        this.logger.debug('Setting language to', lang)
        this.catalogChanged.next(strings)
    }

    getLocale (): string {
        return this.locale
    }
}
