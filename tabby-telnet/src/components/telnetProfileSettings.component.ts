/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component } from '@angular/core'

import { ProfileSettingsComponent } from 'tabby-core'
import { TelnetProfile } from '../session'

/** @hidden */
@Component({
    template: require('./telnetProfileSettings.component.pug'),
})
export class TelnetProfileSettingsComponent implements ProfileSettingsComponent<TelnetProfile> {
    profile: TelnetProfile
}
