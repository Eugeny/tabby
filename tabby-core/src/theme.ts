import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker'
import { Injectable } from '@angular/core'
import { Theme } from './api'

/** @hidden */
@Injectable()
export class StandardTheme extends Theme {
    name = _('Standard (legacy)')
    css = require('./theme.scss')
    terminalBackground = '#222a33'
}

/** @hidden */
@Injectable()
export class StandardCompactTheme extends Theme {
    name = _('Compact (legacy)')
    css = require('./theme.compact.scss')
    terminalBackground = '#222a33'
    macOSWindowButtonsInsetX = 8
    macOSWindowButtonsInsetY = 6
}

/** @hidden */
@Injectable()
export class PaperTheme extends Theme {
    name = _('Paper (legacy)')
    css = require('./theme.paper.scss')
    terminalBackground = '#f7f1e0'
}

/** @hidden */
@Injectable({ providedIn: 'root' })
export class NewTheme extends Theme {
    name = _('Follow the color scheme')
    css = require('./theme.new.scss')
    terminalBackground = '#f7f1e0'
    followsColorScheme = true
}
