/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Inject, Optional } from '@angular/core'
import { BaseComponent, CONTEXT_MENU_DIVIDER, ConfigService, ContextMenuItemDefinitionProvider, ContextMenuItemScope, TranslateService } from 'tabby-core'

interface ContextMenuItemRow {
    id: string
    name: string
    scope: ContextMenuItemScope
    weight: number
}

/** A row shown in the "Enabled" list: a real item, or a divider instance (id === null). */
interface EnabledRow {
    id: string | null
    name: string
}

/** A row shown in the "Disabled" list: a real item, or the permanent "add divider" placeholder. */
interface DisabledRow {
    id: string
    name: string
}

/** Sentinel id for the permanent, always-present "Divider" row in the Disabled list. */
const DIVIDER_PLACEHOLDER_ID = '__divider__'

/**
 * Moves the selected indices of `array` by `delta` (-1 or 1) positions,
 * preserving relative order of contiguous selections, and returns the
 * updated set of selected indices.
 */
function moveSelectedIndices<T> (array: T[], selected: Set<number>, delta: number): Set<number> {
    const indices = [...selected].sort((a, b) => delta < 0 ? a - b : b - a)
    const newSelected = new Set<number>(selected)
    for (const i of indices) {
        const j = i + delta
        if (j < 0 || j >= array.length) {
            continue
        }
        const tmp = array[i]
        array[i] = array[j]
        array[j] = tmp
        newSelected.delete(i)
        newSelected.add(j)
    }
    return newSelected
}

/**
 * Manages the enabled/disabled dual-list state for a single context menu
 * (e.g. the tab bar's or a pane's right-click menu), backed by its own
 * config keys so the two menus can be configured independently:
 *  - a `disabledIds` array controls which items are hidden
 *  - an `order` array controls the ordering of enabled items and the
 *    placement of user-added dividers (`CONTEXT_MENU_DIVIDER` sentinels)
 */
export class ContextMenuEditorSection {
    /** Exposed so the template can identify the permanent "add divider" row in the Disabled list. */
    readonly dividerPlaceholderId = DIVIDER_PLACEHOLDER_ID

    enabledRows: EnabledRow[] = []
    disabledRows: DisabledRow[] = []
    selectedEnabled = new Set<number>()
    selectedDisabled = new Set<string>()

    /**
     * Remembers, for each currently-disabled item id, the id of the enabled
     * item that immediately followed it at the moment it was disabled (or
     * `null` if it was last). Used so re-enabling an item puts it back where
     * it came from instead of always appending it to the end of the list.
     */
    private originalNextId = new Map<string, string | null>()

    constructor (
        public title: string,
        private allItems: ContextMenuItemRow[],
        private getDisabledIds: () => string[],
        private setDisabledIds: (ids: string[]) => void,
        private getOrder: () => string[],
        private setOrder: (order: string[]) => void,
        private dividerLabel: string,
    ) {
        this.refresh()
    }

    /** e.g. "Divider" -> "--- divider ---", so it reads as a visual separator in the lists. */
    private get formattedDividerName (): string {
        return `--- ${this.dividerLabel.toLowerCase()} ---`
    }

    refresh (): void {
        const disabledIds = this.getDisabledIds()
        const order = this.getOrder()
        const byId = new Map(this.allItems.map(item => [item.id, item]))

        const usedIds = new Set<string>()
        const rows: EnabledRow[] = []
        for (const entry of order) {
            if (entry === CONTEXT_MENU_DIVIDER) {
                rows.push({ id: null, name: this.formattedDividerName })
                continue
            }
            if (disabledIds.includes(entry) || usedIds.has(entry)) {
                continue
            }
            const item = byId.get(entry)
            if (item) {
                rows.push({ id: item.id, name: item.name })
                usedIds.add(entry)
            }
        }
        const leftovers: EnabledRow[] = []
        for (const item of this.allItems) {
            if (!disabledIds.includes(item.id) && !usedIds.has(item.id)) {
                leftovers.push({ id: item.id, name: item.name })
                usedIds.add(item.id)
            }
        }
        // Mirrors `applyContextMenuOrder()`: once a menu has been customized
        // (its `order` is non-empty), any never-explicitly-placed/new item is
        // appended after a single separator in the live menu. Show that same
        // separator here so this list previews the live menu accurately.
        if (order.length && leftovers.length && rows.length && rows[rows.length - 1].id !== null) {
            rows.push({ id: null, name: this.formattedDividerName })
        }
        this.enabledRows = [...rows, ...leftovers]

        this.disabledRows = [
            { id: DIVIDER_PLACEHOLDER_ID, name: this.formattedDividerName },
            ...disabledIds
                .map(id => byId.get(id))
                .filter((item): item is ContextMenuItemRow => !!item)
                .map(item => ({ id: item.id, name: item.name })),
        ]
    }

    /** Whether this menu currently has any customization (used to enable/disable the "Restore defaults" button). */
    get isCustomized (): boolean {
        return this.getDisabledIds().length > 0 || this.getOrder().length > 0
    }

    private persist (): void {
        // Disabled = any real item that's not currently present in
        // `enabledRows`. Deriving it this way (rather than from the
        // rendered `disabledRows`, which `disableItem`/`disableSelected`/
        // `disableAll` never touch directly) ensures disabling an item
        // always actually sticks, regardless of which method removed it
        // from the enabled list.
        const enabledIds = new Set(this.enabledRows.filter(r => r.id !== null).map(r => r.id!))
        const disabledIds = this.allItems.filter(item => !enabledIds.has(item.id)).map(item => item.id)
        const order = this.enabledRows.map(r => r.id ?? CONTEXT_MENU_DIVIDER)
        this.setDisabledIds(disabledIds)
        this.setOrder(order)
        this.refresh()
    }

    toggleSelectedEnabled (index: number): void {
        if (this.selectedEnabled.has(index)) {
            this.selectedEnabled.delete(index)
        } else {
            this.selectedEnabled.add(index)
        }
    }

    toggleSelectedDisabled (id: string): void {
        if (this.selectedDisabled.has(id)) {
            this.selectedDisabled.delete(id)
        } else {
            this.selectedDisabled.add(id)
        }
    }

    disableSelected (): void {
        if (!this.selectedEnabled.size) {
            return
        }
        this.rememberPositions(this.selectedEnabled)
        this.enabledRows = this.enabledRows.filter((_, i) => !this.selectedEnabled.has(i))
        this.selectedEnabled.clear()
        this.persist()
    }

    disableItem (index: number): void {
        this.rememberPositions(new Set([index]))
        this.enabledRows.splice(index, 1)
        this.selectedEnabled.clear()
        this.persist()
    }

    disableAll (): void {
        this.rememberPositions(new Set(this.enabledRows.map((_, i) => i)))
        this.enabledRows = []
        this.selectedEnabled.clear()
        this.persist()
    }

    /** Clears all customization for this menu (disabled items, order, and dividers) back to defaults. */
    restoreDefaults (): void {
        this.originalNextId.clear()
        this.selectedEnabled.clear()
        this.selectedDisabled.clear()
        this.setDisabledIds([])
        this.setOrder([])
        this.refresh()
    }

    /**
     * Records, for each real item at the given indices (dividers are
     * skipped, they have no id to restore by), the id of the next
     * surviving row after it in `enabledRows` -- i.e. the row that will
     * still be there once this batch of removals completes -- so it can be
     * re-inserted in the same spot later.
     */
    private rememberPositions (indices: Set<number>): void {
        const snapshot = this.enabledRows
        for (const i of indices) {
            const id = snapshot[i].id
            if (id === null) {
                continue
            }
            let nextId: string | null = null
            for (let j = i + 1; j < snapshot.length; j++) {
                if (indices.has(j)) {
                    continue
                }
                if (snapshot[j].id !== null) {
                    nextId = snapshot[j].id
                    break
                }
            }
            this.originalNextId.set(id, nextId)
        }
    }

    enableSelected (): void {
        if (!this.selectedDisabled.size) {
            return
        }
        this.insertIds([...this.selectedDisabled])
    }

    enableItem (id: string): void {
        this.insertIds([id])
    }

    enableAll (): void {
        const ids = this.disabledRows.filter(r => r.id !== DIVIDER_PLACEHOLDER_ID).map(r => r.id)
        this.insertIds(ids)
    }

    private insertIds (ids: string[]): void {
        if (!ids.length) {
            return
        }
        const explicitAnchor = this.selectedEnabled.size === 1 ? [...this.selectedEnabled][0] : null
        const insertedIndices: number[] = []

        if (explicitAnchor !== null) {
            // The user has a single enabled row selected: treat it as an
            // explicit "insert here" anchor for the whole batch.
            const newRows: EnabledRow[] = ids.map(id => this.makeRow(id))
            const insertAt = explicitAnchor + 1
            this.enabledRows = [
                ...this.enabledRows.slice(0, insertAt),
                ...newRows,
                ...this.enabledRows.slice(insertAt),
            ]
            newRows.forEach((_, i) => insertedIndices.push(insertAt + i))
        } else {
            // No explicit anchor: restore each item to where it was before
            // it was disabled (i.e. right before whatever item used to
            // follow it), falling back to the end of the list if that
            // item is no longer there (or was never known).
            for (const id of ids) {
                const row = this.makeRow(id)
                const nextId = this.originalNextId.get(id)
                const anchorIndex = nextId !== undefined && nextId !== null
                    ? this.enabledRows.findIndex(r => r.id === nextId)
                    : -1
                const insertAt = anchorIndex >= 0 ? anchorIndex : this.enabledRows.length
                this.enabledRows.splice(insertAt, 0, row)
                insertedIndices.push(insertAt)
            }
        }

        for (const id of ids) {
            this.originalNextId.delete(id)
        }
        this.selectedDisabled.clear()
        // Select the newly-inserted row(s) so they're highlighted and can be scrolled into view.
        this.selectedEnabled = new Set(insertedIndices)
        this.persist()
    }

    private makeRow (id: string): EnabledRow {
        return id === DIVIDER_PLACEHOLDER_ID
            ? { id: null, name: this.formattedDividerName }
            : { id, name: this.allItems.find(x => x.id === id)?.name ?? id }
    }

    moveEnabledUp (): void {
        this.moveEnabled(-1)
    }

    moveEnabledDown (): void {
        this.moveEnabled(1)
    }

    private moveEnabled (delta: number): void {
        if (!this.selectedEnabled.size) {
            return
        }
        const newSelected = moveSelectedIndices(this.enabledRows, this.selectedEnabled, delta)
        this.persist()
        this.selectedEnabled = newSelected
    }

    moveDisabledUp (): void {
        this.moveDisabled(-1)
    }

    moveDisabledDown (): void {
        this.moveDisabled(1)
    }

    private moveDisabled (delta: number): void {
        const movableIds = this.disabledRows.filter(r => r.id !== DIVIDER_PLACEHOLDER_ID).map(r => r.id)
        const selectedIndices = new Set<number>()
        movableIds.forEach((id, i) => {
            if (this.selectedDisabled.has(id)) {
                selectedIndices.add(i)
            }
        })
        if (!selectedIndices.size) {
            return
        }
        moveSelectedIndices(movableIds, selectedIndices, delta)
        this.setDisabledIds(movableIds)
        this.refresh()
    }
}

/** @hidden */
@Component({
    selector: 'context-menu-settings-tab',
    templateUrl: './contextMenuSettingsTab.component.pug',
    styleUrls: ['./contextMenuSettingsTab.component.scss'],
})
export class ContextMenuSettingsTabComponent extends BaseComponent {
    /**
     * Scrolls the currently-selected (`.active`) row of the list containing
     * the event's target into view, after the DOM has updated. Used so that
     * inserting/moving an item (e.g. adding a divider to the end of a long
     * list) is visibly obvious rather than happening off-screen.
     */
    scrollActiveIntoView (event: Event): void {
        const target = event.target as HTMLElement
        const editor = target.closest('.context-menu-editor')
        if (!editor) {
            return
        }
        setTimeout(() => {
            editor.querySelector('.list-group-item.active')?.scrollIntoView({ block: 'nearest' })
        })
    }

    sections: ContextMenuEditorSection[]

    constructor (
        public config: ConfigService,
        private translate: TranslateService,
        @Optional() @Inject(ContextMenuItemDefinitionProvider) private itemProviders: ContextMenuItemDefinitionProvider[]|null,
    ) {
        super()

        const seen = new Set<string>()
        const allItems = (this.itemProviders ?? [])
            .flatMap(p => p.getItems())
            .filter(item => {
                if (seen.has(item.id)) {
                    return false
                }
                seen.add(item.id)
                return true
            })
            .map(item => ({
                id: item.id,
                name: this.translate.instant(item.name),
                scope: item.scope ?? 'both' as ContextMenuItemScope,
                weight: item.weight ?? 0,
            }))
            // Matches the real menu's ordering: providers (and thus their
            // items) are sorted by weight; name is only a readability
            // tie-breaker for items sharing the same weight.
            .sort((a, b) => a.weight - b.weight || a.name.localeCompare(b.name))

        const dividerLabel = this.translate.instant('Divider')

        this.sections = [
            new ContextMenuEditorSection(
                this.translate.instant('Tab context menu'),
                allItems.filter(item => item.scope === 'tab' || item.scope === 'both'),
                () => this.config.store.contextMenu?.disabledTabItems ?? [],
                ids => {
                    this.config.store.contextMenu.disabledTabItems = ids
                    this.config.save()
                },
                () => this.config.store.contextMenu?.tabItemsOrder ?? [],
                order => {
                    this.config.store.contextMenu.tabItemsOrder = order
                    this.config.save()
                },
                dividerLabel,
            ),
            new ContextMenuEditorSection(
                this.translate.instant('Pane context menu'),
                allItems.filter(item => item.scope === 'pane' || item.scope === 'both'),
                () => this.config.store.contextMenu?.disabledPaneItems ?? [],
                ids => {
                    this.config.store.contextMenu.disabledPaneItems = ids
                    this.config.save()
                },
                () => this.config.store.contextMenu?.paneItemsOrder ?? [],
                order => {
                    this.config.store.contextMenu.paneItemsOrder = order
                    this.config.save()
                },
                dividerLabel,
            ),
        ]
    }
}
