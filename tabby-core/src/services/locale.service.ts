import { Injectable } from '@angular/core'
import { registerLocaleData } from '@angular/common'
import { TranslateService } from '@ngx-translate/core'

import localeEN from '@angular/common/locales/en'
import localeBG from '@angular/common/locales/bg'
import localeDA from '@angular/common/locales/da'
import localeDE from '@angular/common/locales/de'
import localeES from '@angular/common/locales/es'
import localeFR from '@angular/common/locales/fr'
import localeHR from '@angular/common/locales/hr'
import localeIT from '@angular/common/locales/it'
import localeJA from '@angular/common/locales/ja'
import localePL from '@angular/common/locales/pl'
import localePT from '@angular/common/locales/pt'
import localeRU from '@angular/common/locales/ru'
import localeZH from '@angular/common/locales/zh'
import { Observable, Subject } from 'rxjs'
import { distinctUntilChanged } from 'rxjs/operators'
import { ConfigService } from './config.service'
import { LogService, Logger } from './log.service'

registerLocaleData(localeEN)
registerLocaleData(localeBG)
registerLocaleData(localeDA)
registerLocaleData(localeDE)
registerLocaleData(localeES)
registerLocaleData(localeFR)
registerLocaleData(localeHR)
registerLocaleData(localeIT)
registerLocaleData(localeJA)
registerLocaleData(localePL)
registerLocaleData(localePT)
registerLocaleData(localeRU)
registerLocaleData(localeZH)

function flattenMessageFormatTranslation (po: any) {
    const translation = {}
    po = po.translations['']
    for (const k of Object.keys(po)) {
        translation[k] = po[k].msgstr[0] || k
    }
    return translation
}

@Injectable({ providedIn: 'root' })
export class TranslateServiceWrapper extends TranslateService {
    private _defaultTranslation: Record<string, string>|null

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    getParsedResult (translations: any, key: any, interpolateParams?: any): any {
        if (!this._defaultTranslation) {
            const po = require(`../../../locale/en-US.po`)
            this._defaultTranslation = flattenMessageFormatTranslation(po)
        }
        this.translations[this.defaultLang][key] ??= this.compiler.compile(
            this._defaultTranslation[key] || key,
            this.defaultLang
        )
        return super.getParsedResult(translations, key, interpolateParams ?? {})
    }
}

@Injectable({ providedIn: 'root' })
export class LocaleService {
    private logger: Logger

    static allLanguages = [
        {
            code: 'da-DK',
            name: 'Dansk',
        },
        {
            code: 'de-DE',
            name: 'Deutsch',
        },
        {
            code: 'en-US',
            name: 'English',
        },
        {
            code: 'es-ES',
            name: 'Español',
        },
        {
            code: 'fr-FR',
            name: 'Français',
        },
        {
            code: 'hr-HR',
            name: 'Hrvatski',
        },
        {
            code: 'it-IT',
            name: 'Italiano',
        },
        {
            code: 'pl-PL',
            name: 'Polski',
        },
        {
            code: 'pt-PT',
            name: 'Português',
        },
        {
            code: 'pt-BR',
            name: 'Português do Brasil',
        },
        {
            code: 'bg-BG',
            name: 'Български',
        },
        {
            code: 'ru-RU',
            name: 'Русский',
        },
        {
            code: 'ja-JP',
            name: '日本語',
        },
        {
            code: 'zh-CN',
            name: '中文（简体）',
        },
        {
            code: 'zh-TW',
            name: '中文 (繁體)',
        },
    ]

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
    }

    refresh (): void {
        let lang = this.config.store.language
        if (!lang) {
            for (const systemLanguage of navigator.languages) {
                if (!lang && LocaleService.allLanguages.some(x => x.code === systemLanguage)) {
                    lang = systemLanguage
                }
            }
        }
        lang ??= 'en-US'
        this.setLocale(lang)
    }

    async setLocale (lang: string): Promise<void> {
        if (!this.translate.langs.includes(lang)) {
            this.translate.addLangs([lang])

            const po = require(`../../../locale/${lang}.po`)
            const translation = flattenMessageFormatTranslation(po)
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
