import { Inject, Injectable, Optional } from '@angular/core'
import { AppService, Command, CommandContext, ConfigService, MenuItemOptions, SplitTabComponent, TabContextMenuItemProvider, ToolbarButton, ToolbarButtonProvider, TranslateService } from '../api'
import { SelectorService } from './selector.service'

@Injectable({ providedIn: 'root' })
export class CommandService {
    constructor (
        private selector: SelectorService,
        private config: ConfigService,
        private app: AppService,
        private translate: TranslateService,
        @Optional() @Inject(TabContextMenuItemProvider) protected contextMenuProviders: TabContextMenuItemProvider[],
        @Inject(ToolbarButtonProvider) private toolbarButtonProviders: ToolbarButtonProvider[],
    ) {
        this.contextMenuProviders.sort((a, b) => a.weight - b.weight)
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
                for (let section of await Promise.all(this.contextMenuProviders.map(x => x.getItems(context.tab!, tabHeader)))) {
                    // eslint-disable-next-line @typescript-eslint/no-loop-func
                    section = section.filter(item => !items.some(ex => ex.label === item.label))
                    items = items.concat(section)
                }
                if (context.tab instanceof SplitTabComponent) {
                    const tab = context.tab.getFocusedTab()
                    if (tab) {
                        for (let section of await Promise.all(this.contextMenuProviders.map(x => x.getItems(tab, tabHeader)))) {
                            // eslint-disable-next-line @typescript-eslint/no-loop-func
                            section = section.filter(item => !items.some(ex => ex.label === item.label))
                            items = items.concat(section)
                        }
                    }
                }
            }
        }

        items = items.filter(x => (x.enabled ?? true) && x.type !== 'separator')

        const flatItems: MenuItemOptions[] = []
        function flattenItem (item: MenuItemOptions, prefix?: string): void {
            if (item.submenu) {
                item.submenu.forEach(x => flattenItem(x, (prefix ? `${prefix} > ` : '') + (item.commandLabel ?? item.label)))
            } else {
                flatItems.push({
                    ...item,
                    label: (prefix ? `${prefix} > ` : '') + (item.commandLabel ?? item.label),
                })
            }
        }
        items.forEach(x => flattenItem(x))

        let commands = buttons.map(x => Command.fromToolbarButton(x))
        commands = commands.concat(flatItems.map(x => Command.fromMenuItem(x)))

        return commands
    }

    async showSelector (): Promise<void> {
        const context: CommandContext = {}
        const tab = this.app.activeTab
        if (tab instanceof SplitTabComponent) {
            context.tab = tab.getFocusedTab() ?? undefined
        }
        const commands = await this.getCommands(context)
        await this.selector.show(
            this.translate.instant('Commands'),
            commands.map(c => ({
                name: c.label,
                callback: c.click,
                description: c.sublabel,
                icon: c.icon,
            })),
        )
    }
}
