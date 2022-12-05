import { BaseTabComponent } from '../components/baseTab.component'
import { MenuItemOptions } from './menu'
import { ToolbarButton } from './toolbarButtonProvider'

export enum CommandLocation {
    LeftToolbar = 'left-toolbar',
    RightToolbar = 'right-toolbar',
    StartPage = 'start-page',
}

export class Command {
    id?: string
    label: string
    sublabel?: string
    locations?: CommandLocation[]
    run: () => Promise<void>

    /**
     * Raw SVG icon code
     */
    icon?: string

    /**
     * Optional Touch Bar icon ID
     */
    touchBarNSImage?: string

    /**
     * Optional Touch Bar button label
     */
    touchBarTitle?: string

    weight?: number

    static fromToolbarButton (button: ToolbarButton): Command {
        const command = new Command()
        command.label = button.title
        command.run = async () => button.click?.()
        command.icon = button.icon
        command.locations = [CommandLocation.StartPage]
        if ((button.weight ?? 0) <= 0) {
            command.locations.push(CommandLocation.LeftToolbar)
        }
        if ((button.weight ?? 0) > 0) {
            command.locations.push(CommandLocation.RightToolbar)
        }
        command.touchBarNSImage = button.touchBarNSImage
        command.touchBarTitle = button.touchBarTitle
        command.weight = button.weight
        return command
    }

    static fromMenuItem (item: MenuItemOptions): Command {
        const command = new Command()
        command.label = item.commandLabel ?? item.label ?? ''
        command.sublabel = item.sublabel
        command.run = async () => item.click?.()
        return command
    }
}

export interface CommandContext {
    tab?: BaseTabComponent,
}

/**
 * Extend to add commands
 */
export abstract class CommandProvider {
    abstract provide (context: CommandContext): Promise<Command[]>
}
