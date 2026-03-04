import { Injectable } from '@angular/core'
import { CommandProvider, Command, CommandContext, AppService, TabsService, SplitTabComponent, BaseTabComponent } from 'tabby-core'
import { LocalFileManagerTabComponent } from './components/localFileManagerTab.component'
import * as fs from 'fs'

@Injectable()
export class LocalFileManagerCommandProvider extends CommandProvider {
    private previousTabs = new WeakMap<SplitTabComponent, BaseTabComponent>()

    constructor (
        private app: AppService,
        private tabs: TabsService,
    ) {
        super()
    }

    async provide (context: CommandContext): Promise<Command[]> {
        return [
            {
                id: 'open-local-file-manager',
                label: 'Open Local File Manager',
                sublabel: 'Open a graphical file manager for local files',
                icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M464 128H272l-64-64H48C21.49 64 0 85.49 0 112v288c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V176c0-26.51-21.49-48-48-48z"/></svg>`,
                run: async () => {
                    await this.openInPlace(context.tab ?? this.app.activeTab)
                },
            },
        ]
    }

    private async openInPlace (tab: BaseTabComponent|null): Promise<void> {
        if (!tab) {
            this.app.openNewTabRaw({ type: LocalFileManagerTabComponent })
            return
        }
        if (!(tab instanceof SplitTabComponent)) {
            this.app.openNewTabRaw({ type: LocalFileManagerTabComponent })
            return
        }

        const relative = tab.getFocusedTab() ?? tab.getAllTabs()[0] ?? null
        if (!relative) {
            this.app.openNewTabRaw({ type: LocalFileManagerTabComponent })
            return
        }

        if (relative instanceof LocalFileManagerTabComponent) {
            const previous = this.previousTabs.get(tab)
            if (previous) {
                this.previousTabs.delete(tab)
                tab.replaceTab(relative, previous)
            }
            return
        }

        let cwd: string|null = null
        try {
            cwd = relative && (relative as any).session?.getWorkingDirectory
                ? await (relative as any).session.getWorkingDirectory()
                : null
        } catch {
            cwd = null
        }
        if (cwd && !fs.existsSync(cwd)) {
            cwd = null
        }

        const fileManager = this.tabs.create({
            type: LocalFileManagerTabComponent,
            inputs: {
                initialPath: cwd ?? undefined,
            },
        })
        this.previousTabs.set(tab, relative)
        tab.replaceTab(relative, fileManager)
    }
}
