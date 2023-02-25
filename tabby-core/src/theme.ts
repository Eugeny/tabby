import { Injectable } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { Theme } from './api'

/** @hidden */
@Injectable()
export class StandardTheme extends Theme {
    name = this.translate.instant('Standard (legacy)')
    css = require('./theme.scss')
    terminalBackground = '#222a33'

    constructor (private translate: TranslateService) {
        super()
    }
}

/** @hidden */
@Injectable()
export class StandardCompactTheme extends Theme {
    name = this.translate.instant('Compact (legacy)')
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
    name = 'Paper (legacy)'
    css = require('./theme.paper.scss')
    terminalBackground = '#f7f1e0'
}

/** @hidden */
@Injectable({ providedIn: 'root' })
export class NewTheme extends Theme {
    name = this.translate.instant('Follow the color scheme')
    css = require('./theme.new.scss')
    terminalBackground = '#f7f1e0'
    followsColorScheme = true

    constructor (private translate: TranslateService) {
        super()
    }
}
