/**
 * Which context menu(s) an item can appear in.
 */
export type ContextMenuItemScope = 'tab' | 'pane' | 'both'

/**
 * Describes a single togglable entry in the "Context menu" settings tab.
 */
export interface ContextMenuItemDefinition {
    /** Must match the `id` set on the corresponding `MenuItemOptions` */
    id: string

    /** Human readable, translatable name shown in the settings UI */
    name: string

    /**
     * Which menu(s) this item can appear in - the tab bar's context menu,
     * a pane's context menu, or both. Defaults to `'both'` when omitted.
     */
    scope?: ContextMenuItemScope

    /**
     * Determines this item's default position among never-customized items,
     * mirroring the `weight` of the `TabContextMenuItemProvider` that
     * actually contributes it at runtime (lower sorts earlier). Keep this
     * in sync with that provider's `weight` so the "Context menu" settings
     * tab's default order matches the live menu. Defaults to `0` when
     * omitted, matching `TabContextMenuItemProvider`'s own default.
     */
    weight?: number
}

/**
 * Extend to contribute configurable context menu items to the
 * "Context menu" settings tab. Items registered here can be individually
 * enabled or disabled by the user; disabled items are hidden from every
 * tab and pane context menu.
 */
export abstract class ContextMenuItemDefinitionProvider {
    abstract getItems (): ContextMenuItemDefinition[]
}
