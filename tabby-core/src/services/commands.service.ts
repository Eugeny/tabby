import { Inject, Injectable, Optional } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { Command, CommandContext, CommandLocation, CommandProvider, MenuItemOptions, SplitTabComponent, TabContextMenuItemProvider, ToolbarButton, ToolbarButtonProvider } from '../api'
import { AppService } from './app.service'
import { ConfigService } from './config.service'
import { SelectorService } from './selector.service'
import { firstBy } from 'thenby'

@Injectable({ providedIn: 'root' })
export class CommandService {
    private lastCommand = Promise.resolve()

    constructor (
        private selector: SelectorService,
        private config: ConfigService,
        private app: AppService,
        private translate: TranslateService,
        @Optional() @Inject(TabContextMenuItemProvider) protected contextMenuProviders: TabContextMenuItemProvider[]|null,
        @Optional() @Inject(ToolbarButtonProvider) private toolbarButtonProviders: ToolbarButtonProvider[],
        @Inject(CommandProvider) private commandProviders: CommandProvider[],
    ) {
        this.contextMenuProviders?.sort((a, b) => a.weight - b.weight)
    }

    async getCommands (context: CommandContext): Promise<Command[]> {
        let buttons: ToolbarButton[] = []
        this.config.enabledServices(this.toolbarButtonProviders).forEach(provider => {
            buttons = buttons.concat(provider.provide())
        })
        buttons = buttons
            .sort((a: ToolbarButton, b: ToolbarButton) => (a.weight ?? 0) - (b.weight ?? 0))

        let items: MenuItemOptions[] = []
        if (context.tab) {
            for (const tabHeader of [false, true]) {
                // Top-level tab menu
                for (let section of await Promise.all(this.contextMenuProviders?.map(x => x.getItems(context.tab!, tabHeader)) ?? [])) {
                    // eslint-disable-next-line @typescript-eslint/no-loop-func
                    section = section.filter(item => !items.some(ex => ex.label === item.label))
                    items = items.concat(section)
                }
                if (context.tab instanceof SplitTabComponent) {
                    const tab = context.tab.getFocusedTab()
                    if (tab) {
                        for (let section of await Promise.all(this.contextMenuProviders?.map(x => x.getItems(tab, tabHeader)) ?? [])) {
                            // eslint-disable-next-line @typescript-eslint/no-loop-func
                            section = section.filter(item => !items.some(ex => ex.label === item.label))
                            items = items.concat(section)
                        }
                    }
                }
            }
        }

        items = items.filter(x => (x.enabled ?? true) && x.type !== 'separator')

        const commands = [
            ...buttons.map(x => Command.fromToolbarButton(x)),
            ...items.map(x => Command.fromMenuItem(x)).flat(),
        ]

        for (const provider of this.config.enabledServices(this.commandProviders)) {
            commands.push(...await provider.provide(context))
        }

        return commands
            .filter(c => !this.config.store.commandBlacklist.includes(c.id))
            .sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0))
            .map(command => {
                if (command.run) {
                    const run = command.run
                    command.run = async () => {
                        // Serialize execution
                        this.lastCommand = this.lastCommand.finally(run)
                        await this.lastCommand
                    }
                }
                return command
            })
    }

    async getCommandsWithContexts (context: CommandContext[]): Promise<Command[]> {
        let commands: Command[] = []

        for (const commandSet of await Promise.all(context.map(x => this.getCommands(x)))) {
            for (const command of commandSet) {
                // eslint-disable-next-line @typescript-eslint/no-loop-func
                commands = commands.filter(x => x.id !== command.id)
                commands.push(command)
            }
        }

        return commands
    }

    async run (id: string, context: CommandContext): Promise<void> {
        const commands = await this.getCommands(context)
        const command = commands.find(x => x.id === id)
        await command?.run?.()
    }

    async showSelector (): Promise<void> {
        if (this.selector.active) {
            return
        }

        const contexts: CommandContext[] = [{}]
        if (this.app.activeTab) {
            contexts.push({ tab: this.app.activeTab })
        }
        if (this.app.activeTab instanceof SplitTabComponent) {
            const tab = this.app.activeTab.getFocusedTab()
            if (tab) {
                contexts.push({ tab })
            }
        }

        const commands = (await this.getCommandsWithContexts(contexts))
            .filter(x => x.run)
            .sort(firstBy(x => x.weight ?? 0))

        return this.selector.show(
            this.translate.instant('Commands'),
            commands.map(c => ({
                name: c.fullLabel ?? c.label,
                callback: c.run,
                icon: c.icon,
            })),
        )
    }

    /** @hidden */
    async buildContextMenu (contexts: CommandContext[], location: CommandLocation): Promise<MenuItemOptions[]> {
        let commands = await this.getCommandsWithContexts(contexts)

        commands = commands.filter(x => x.locations.includes(location))
        commands.sort(firstBy(x => x.weight ?? 0))

        interface Group {
            id?: string
            weight: number
            commands: Command[]
        }

        const groups: Group[] = []

        for (const command of commands.filter(x => !x.parent)) {
            let group = groups.find(x => x.id === command.group)
            if (!group) {
                group = {
                    id: command.group,
                    weight: 0,
                    commands: [],
                }
                groups.push(group)
            }
            group.weight += command.weight ?? 0
            group.commands.push(command)
        }

        groups.sort(firstBy(x => x.weight / x.commands.length))

        function mapCommand (command: Command): MenuItemOptions {
            const submenu = command.id ? commands.filter(x => x.parent === command.id).map(mapCommand) : []
            return {
                label: command.label,
                submenu: submenu.length ? submenu : undefined,
                checked: command.checked,
                enabled: !!command.run || !!submenu.length,
                type: command.checked ? 'checkbox' : undefined,
                click: () => command.run?.(),
            }
        }

        const items: MenuItemOptions[] = []
        for (const group of groups) {
            items.push({ type: 'separator' })
            items.push(...group.commands.map(mapCommand))
        }

        return items.slice(1)
    }
}
