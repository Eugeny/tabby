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
        config.ready$.subscribe(() => {
            this.refresh()
        })

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
        let lang = this.config.store.language
        if (!lang) {
            const systemLanguage = navigator.language.toLowerCase().split('-')[0]
            if (this.allLanguages.some(x => x.code === systemLanguage)) {
                lang = systemLanguage
            }
        }
        lang ??= 'en'
        this.setLocale(lang)
    }

    async setLocale (lang: string): Promise<void> {
        const strings = this.translations[lang]

        if (!this.translate.langs.includes(lang)) {
            this.translate.addLangs([lang])

            const po = require(`../../../locale/${lang}.po`).translations['']
            const translation = {}
            for (const k of Object.keys(po)) {
                translation[k] = po[k].msgstr[0] || k
            }

            this.translate.setTranslation(lang, translation)
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
