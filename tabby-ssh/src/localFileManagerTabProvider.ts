import { Injectable } from '@angular/core'
import { TabContextMenuItemProvider, AppService, MenuItemOptions, TabsService, SplitTabComponent, BaseTabComponent } from 'tabby-core'
import { LocalFileManagerTabComponent } from './components/localFileManagerTab.component'
import * as fs from 'fs'

@Injectable()
export class LocalFileManagerTabProvider extends TabContextMenuItemProvider {
    private previousTabs = new WeakMap<SplitTabComponent, BaseTabComponent>()

    constructor (
        private app: AppService,
        private tabs: TabsService,
    ) {
        super()
    }

    async getItems (tab: any): Promise<MenuItemOptions[]> {
        return [
            {
                label: 'Open Local File Manager',
                click: () => {
                    void this.openInPlace(this.app.activeTab)
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
