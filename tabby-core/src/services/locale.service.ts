import { Injectable } from '@angular/core'
import { registerLocaleData } from '@angular/common'
import { TranslateService } from '@ngx-translate/core'

import localeEN from '@angular/common/locales/en'
import localeDA from '@angular/common/locales/da'
import localeDE from '@angular/common/locales/de'
import localeES from '@angular/common/locales/es'
import localeFR from '@angular/common/locales/fr'
import localeHR from '@angular/common/locales/hr'
import localeJA from '@angular/common/locales/ja'
import localePL from '@angular/common/locales/pl'
import localeRU from '@angular/common/locales/ru'
import localeZH from '@angular/common/locales/zh'
import { Observable, Subject } from 'rxjs'
import { distinctUntilChanged } from 'rxjs/operators'
import { ConfigService } from './config.service'
import { LogService, Logger } from './log.service'

registerLocaleData(localeEN)
registerLocaleData(localeDA)
registerLocaleData(localeDE)
registerLocaleData(localeES)
registerLocaleData(localeFR)
registerLocaleData(localeHR)
registerLocaleData(localeJA)
registerLocaleData(localePL)
registerLocaleData(localeRU)
registerLocaleData(localeZH)

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

    static readonly allLocales = [
        'en-US',
        'da-DK',
        'de-DE',
        'es-ES',
        'fr-FR',
        'hr-HR',
        'ja-JP',
        'pl-PL',
        'ru-RU',
        'zh-CN',
        'zh-TW',
    ]

    readonly allLanguages: { code: string, name: string }[]

    get localeChanged$ (): Observable<string> {
        return this.localeChanged.pipe(distinctUntilChanged())
    }

    private locale = 'en-US'
    private localeChanged = new Subject<string>()

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
                code: 'en-US',
                name: translate.instant('English'),
            },
            {
                code: 'zh-CN',
                name: translate.instant('Chinese (simplified)'),
            },
            {
                code: 'zh-TW',
                name: translate.instant('Chinese (traditional)'),
            },
            {
                code: 'hr-HR',
                name: translate.instant('Croatian'),
            },
            {
                code: 'de-DE',
                name: translate.instant('German'),
            },
            {
                code: 'fr-FR',
                name: translate.instant('French'),
            },
            {
                code: 'ja-JP',
                name: translate.instant('Japanese'),
            },
            {
                code: 'pl-PL',
                name: translate.instant('Polish'),
            },
            {
                code: 'ru-RU',
                name: translate.instant('Russian'),
            },
            {
                code: 'es-ES',
                name: translate.instant('Spanish'),
            },
        ]

        this.translate.setTranslation('en-US', {})
    }

    refresh (): void {
        let lang = this.config.store.language
        if (!lang) {
            for (const systemLanguage of navigator.languages) {
                if (!lang && this.allLanguages.some(x => x.code === systemLanguage)) {
                    lang = systemLanguage
                }
            }
        }
        lang ??= 'en-US'
        this.setLocale(lang)
    }

    async setLocale (lang: string): Promise<void> {
        if (!this.translate.langs.includes(lang) && lang !== 'en-US') {
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
    }

    getLocale (): string {
        return this.locale
    }
}
