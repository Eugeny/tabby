import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker'
import { NotificationsService, SelectorService, TranslateService } from 'tabby-core'
import { BAUD_RATES } from './api'

export function selectBaudRate (
    selector: SelectorService,
    translate: TranslateService,
    notifications: NotificationsService,
): Promise<number|null> {
    return new Promise(resolve => {
        selector.show<number>(translate.instant(_('Baud rate')), [
            ...BAUD_RATES.map(x => ({ name: x.toString(), result: x, weight: x })),
            {
                name: translate.instant('custom'), // not visible
                description: translate.instant(_('(Custom)')),
                freeInputPattern: translate.instant(_('Use %s baud')),
                callback: (q?: string) => {
                    const input = q?.trim() ?? ''
                    if (/^\d+$/.test(input) && parseInt(input, 10) > 0) {
                        resolve(parseInt(input, 10))
                    } else {
                        notifications.error(translate.instant(_('Invalid baud rate: {input}'), { input }))
                        resolve(null)
                    }
                },
            },
        ]).then(
            rate => { if (rate != null) {resolve(rate)} }, // standard rate
            () => resolve(null),                           // cancelled
        )
    })
}
