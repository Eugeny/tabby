import { Injectable } from '@angular/core'
import { Theme } from './api'


@Injectable()
export class StandardTheme extends Theme {
    name = 'Standard'
    css = require('./theme.scss')
    terminalBackground = '#1D272D'
}
