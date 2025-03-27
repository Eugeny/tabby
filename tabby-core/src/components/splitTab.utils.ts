import { SplitContainer, SplitDirection, ResizeDirection } from './splitTab.models'
import { BaseTabComponent } from './baseTab.component'
import { SplitTabComponent } from './splitTab.component'

export function updateTabTitle(instance: SplitTabComponent): void {
    if (instance.disableDynamicTitle) return
    const titles = [...new Set(instance.getAllTabs().map(x => x.title))]
    instance.setTitle(titles.join(' | '))
}

export function attachTabView(instance: SplitTabComponent, tab: BaseTabComponent): void {
    const ref = tab.insertIntoContainer(instance.viewContainer)
    instance['viewRefs'].set(tab, ref)
    const element = ref.rootNodes[0] as HTMLElement
    tab.addEventListenerUntilDestroyed(element, 'click', () => instance.focus(tab))
    tab.subscribeUntilDestroyed(tab.titleChange$, () => updateTabTitle(instance))
    tab.subscribeUntilDestroyed(tab.activity$, a => a ? instance.displayActivity() : instance.clearActivity())
    tab.subscribeUntilDestroyed(tab.progress$, p => instance.setProgress(p))
    tab.subscribeUntilDestroyed(tab.recoveryStateChangedHint$, () => instance.recoveryStateChanged())
    tab.subscribeUntilDestroyed(tab.destroyed$, () => instance.removeTab(tab))
}

export async function insertTabToParent(
    instance: SplitTabComponent,
    tab: BaseTabComponent,
    relative: BaseTabComponent | null,
    side: SplitDirection
): Promise<void> {
    const parent = relative ? instance.getParentOf(relative) : null
    const container = parent ?? instance.root
    if (!container) return

    if (tab.parent instanceof SplitTabComponent) tab.parent.removeTab(tab)
    tab.removeFromContainer()
    tab.parent = instance

    const index = relative ? container.children.indexOf(relative) + (['t', 'l'].includes(side) ? 0 : 1) : container.children.length
    container.children.splice(index, 0, tab)
    container.ratios.splice(index, 0, 1 / (container.children.length + 1))

    const ratio = 1 / container.children.length
    container.ratios = container.children.map(() => ratio)

    attachTabView(instance, tab)
    instance['recoveryStateChangedHint'].next()
    instance.layout()
}

export function removeTabFromParent(instance: SplitTabComponent, tab: BaseTabComponent): void {
    const parent = instance.getParentOf(tab)
    if (!parent) return
    const index = parent.children.indexOf(tab)
    parent.children.splice(index, 1)
    parent.ratios.splice(index, 1)
    tab.removeFromContainer()
    tab.parent = null
    instance['viewRefs'].delete(tab)
    instance.layout()
    instance['tabRemoved'].next(tab)
}

export function layoutRootContainer(instance: SplitTabComponent): void {
    instance.root.normalize()
    // Le layout complet peut être réinjecté ici si besoin
}

export async function recoverSplitContainer(
    instance: SplitTabComponent,
    root: SplitContainer,
    state: any
): Promise<void> {
    root.orientation = state.orientation
    root.ratios = state.ratios
    root.children = []

    for (const childState of state.children) {
        if (!childState) continue
        if (childState.type === 'app:split-tab') {
            const child = new SplitContainer()
            await recoverSplitContainer(instance, child, childState)
            root.children.push(child)
        } else {
            const recovered = await instance['tabRecovery'].recoverTab(childState)
            if (recovered) {
                const tab = instance['tabsService'].create(recovered)
                root.children.push(tab)
                tab.parent = instance
                attachTabView(instance, tab)
            }
        }
    }

    while (root.ratios.length < root.children.length) {
        root.ratios.push(1 / root.children.length)
    }

    root.normalize()
}

export function navigateToDirection(instance: SplitTabComponent, dir: SplitDirection): void {
    const from = instance.getFocusedTab()
    if (!from) return
    const all = instance.getAllTabs()
    const index = all.indexOf(from)
    const target = all[(index + 1) % all.length] // Peut être adapté à une vraie direction plus tard
    instance.focus(target)
}

export function resizeFocusedPane(instance: SplitTabComponent, direction: ResizeDirection): void {
    // TODO: Implémenter la logique réelle, ici on force juste un layout pour test
    instance.layout()
}
