import slugify from 'slugify'
import { BaseTabComponent } from '../components/baseTab.component'
import { MenuItemOptions } from './menu'
import { ToolbarButton } from './toolbarButtonProvider'

export enum CommandLocation {
    LeftToolbar = 'left-toolbar',
    RightToolbar = 'right-toolbar',
    StartPage = 'start-page',
    TabHeaderMenu = 'tab-header-menu',
    TabBodyMenu = 'tab-body-menu',
    SFTPItemMenu = 'sftp-item-menu',
}

export class Command {
    id: string
    label: string
    fullLabel?: string
    locations: CommandLocation[]
    run?: () => Promise<any>

    /**
     * Hotkey ID (see HotkeyProvider) that runs this command when pressed
     * with the command's context active
     */
    hotkey?: string

    /**
     * Raw SVG icon code
     */
    icon?: string

    weight?: number

    parent?: string

    group?: string

    /**
     * Set (true or false) to render as a checkbox, leave undefined for a plain item
     */
    checked?: boolean

    static fromToolbarButton (button: ToolbarButton): Command {
        const command = new Command()
        command.id = `legacy:${slugify(button.title)}`
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
        command.weight = button.weight
        return command
    }

    static fromMenuItem (item: MenuItemOptions): Command[] {
        if (item.type === 'separator') {
            return []
        }
        const commands: Command[] = [{
            id: `legacy:${slugify(item.commandLabel ?? item.label).toLowerCase()}`,
            label: item.commandLabel ?? item.label,
            // No run = rendered disabled and kept out of the command palette
            run: (item.enabled ?? true) ? async () => item.click?.() : undefined,
            locations: [CommandLocation.TabBodyMenu, CommandLocation.TabHeaderMenu],
            // ponytail: radio items become checkboxes, add a Command.type if exclusivity matters
            checked: item.type === 'checkbox' || item.type === 'radio' ? !!item.checked : item.checked,
        }]
        for (const submenu of item.submenu ?? []) {
            commands.push(...Command.fromMenuItem(submenu).map(x => ({
                ...x,
                id: `${commands[0].id}:${slugify(x.label).toLowerCase()}`,
                parent: commands[0].id,
            })))
        }
        return commands
    }
}

/**
 * Plugins can add fields via module augmentation (see tabby-ssh)
 */
export interface CommandContext {
    tab?: BaseTabComponent,
}

/**
 * Extend to add commands
 */
export abstract class CommandProvider {
    abstract provide (context: CommandContext): Promise<Command[]>
}
