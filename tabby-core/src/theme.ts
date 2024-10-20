import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker'
import { Injectable } from '@angular/core'
import { Theme } from './api'

/** @hidden */
@Injectable({ providedIn: 'root' })
export class NewTheme extends Theme {
    name = _('Follow the color scheme')
    css = require('./theme.new.scss')
    terminalBackground = '#f7f1e0'
    followsColorScheme = true
}
