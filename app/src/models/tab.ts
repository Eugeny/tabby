import { BaseTabComponent } from 'components/baseTab'
import { Session } from 'services/sessions'

declare type ComponentType<T extends Tab> = new (...args: any[]) => BaseTabComponent<T>

export class Tab {
    id: number
    title: string
    scrollable: boolean
    hasActivity = false
    static lastTabID = 0

    constructor () {
        this.id = Tab.lastTabID++
    }

    displayActivity () {
        this.hasActivity = true
    }

    getComponentType (): ComponentType<Tab> {
        return null
    }

    destroy (): void { }
}


import { SettingsPaneComponent } from 'components/settingsPane'

export class SettingsTab extends Tab {
    constructor () {
        super()
        this.title = 'Settings'
        this.scrollable = true
    }

    getComponentType (): ComponentType<SettingsTab> {
        return SettingsPaneComponent
    }
}


import { TerminalTabComponent } from 'components/terminalTab'

export class TerminalTab extends Tab {
    constructor (public session: Session) {
        super()
    }

    getComponentType (): ComponentType<TerminalTab> {
        return TerminalTabComponent
    }
}
