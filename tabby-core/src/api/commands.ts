import { BaseTabComponent } from '../components/baseTab.component'
import { MenuItemOptions } from './menu'
import { ToolbarButton } from './toolbarButtonProvider'

export class Command {
    label: string
    sublabel?: string
    click?: () => void

    /**
     * Raw SVG icon code
     */
    icon?: string

    static fromToolbarButton (button: ToolbarButton): Command {
        const command = new Command()
        command.label = button.commandLabel ?? button.title
        command.click = button.click
        command.icon = button.icon
        return command
    }

    static fromMenuItem (item: MenuItemOptions): Command {
        const command = new Command()
        command.label = item.commandLabel ?? item.label ?? ''
        command.sublabel = item.sublabel
        command.click = item.click
        return command
    }
}

export interface CommandContext {
    tab?: BaseTabComponent,
}
