import { Injectable } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { Theme } from './api'

/** @hidden */
@Injectable()
export class StandardTheme extends Theme {
    name = this.translate.instant('Standard')
    css = require('./theme.scss')
    terminalBackground = '#222a33'

    constructor (private translate: TranslateService) {
        super()
    }
}

/** @hidden */
@Injectable()
export class StandardCompactTheme extends Theme {
    name = this.translate.instant('Compact')
    css = require('./theme.compact.scss')
    terminalBackground = '#222a33'
    macOSWindowButtonsInsetX = 8
    macOSWindowButtonsInsetY = 6

    constructor (private translate: TranslateService) {
        super()
    }
}

/** @hidden */
@Injectable()
export class PaperTheme extends Theme {
    name = 'Paper'
    css = require('./theme.paper.scss')
    terminalBackground = '#f7f1e0'
}
