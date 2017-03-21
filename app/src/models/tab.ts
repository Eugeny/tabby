import { Subscription } from 'rxjs'
import { Session } from 'services/sessions'


export class Tab {
    id: number
    title: string
    scrollable: boolean
    hasActivity = false
    static lastTabID = 0

    constructor () {
        this.id = Tab.lastTabID++
    }

    getComponentType (): (new (...args: any[])) {
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

    getComponentType (): (new (...args: any[])) {
        return SettingsPaneComponent
    }
}


import { TerminalComponent } from 'components/terminal'

export class TerminalTab extends Tab {
    private activitySubscription: Subscription

    constructor (public session: Session) {
        super()
        // ignore the initial refresh
        setTimeout(() => {
            this.activitySubscription = this.session.dataAvailable.subscribe(() => {
                this.hasActivity = true
            })
        }, 500)
    }

    getComponentType (): (new (...args: any[])) {
        return TerminalComponent
    }

    destroy () {
        super.destroy()
        if (this.activitySubscription) {
            this.activitySubscription.unsubscribe()
        }
    }
}
