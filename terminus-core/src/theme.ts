import { Injectable } from '@angular/core'
import { Theme } from './api'

@Injectable()
export class StandardTheme extends Theme {
    name = 'Standard'
    css = require('./theme.scss')
    terminalBackground = '#1D272D'
}

@Injectable()
export class StandardCompactTheme extends Theme {
    name = 'Compact'
    css = require('./theme.compact.scss')
    terminalBackground = '#1D272D'
}

@Injectable()
export class PaperTheme extends Theme {
    name = 'Paper'
    css = require('./theme.paper.scss')
    terminalBackground = '#1D272D'
}
