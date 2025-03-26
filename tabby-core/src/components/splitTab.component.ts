// Le code d'origine est très long, donc pour cette session, concentrons le refactoring sur la méthode `resizePane`
// qui a une complexité cyclomatique élevée en raison des nombreuses conditions.

// Avant :
resizePane (direction: ResizeDirection): void {
    const resizeStep = this.config.store.terminal.paneResizeStep

    let directionvh: SplitOrientation = 'h'
    const isDecreasing: boolean = direction === 'dv' || direction === 'dh'

    if (direction === 'dh') directionvh = 'h'
    if (direction === 'dv') directionvh = 'v'
    if (direction === 'h') directionvh = 'h'
    if (direction === 'v') directionvh = 'v'

    if (!this.focusedTab) {
        console.debug('No currently focused tab')
        return
    }

    let currentContainer: BaseTabComponent | SplitContainer = this.focusedTab
    let child: BaseTabComponent | SplitContainer | null = this.focusedTab
    let curSplitOrientation: SplitOrientation | null = null

    while (curSplitOrientation !== directionvh) {
        const parentContainer = this.getParentOf(currentContainer)
        if (!parentContainer) return
        child = currentContainer
        currentContainer = parentContainer
        if (currentContainer instanceof SplitContainer) {
            curSplitOrientation = currentContainer.orientation
        }
    }

    if (!(currentContainer instanceof SplitContainer)) return

    const currentChildIndex = currentContainer.children.indexOf(child)
    let updatedRatio = isDecreasing
        ? currentContainer.ratios[currentChildIndex] - resizeStep
        : currentContainer.ratios[currentChildIndex] + resizeStep

    if (updatedRatio < 0 || updatedRatio > 1) return

    currentContainer.ratios[currentChildIndex] = updatedRatio
    this.layout()
}

// Refactor : Simplifier les conditions et réduire la complexité
resizePane (direction: ResizeDirection): void {
    const resizeStep = this.config.store.terminal.paneResizeStep
    const isDecreasing = direction.startsWith('d')
    const orientationMap: Record<ResizeDirection, SplitOrientation> = {
        'v': 'v', 'h': 'h', 'dv': 'v', 'dh': 'h'
    }
    const directionvh = orientationMap[direction]

    if (!this.focusedTab) return

    let current: BaseTabComponent | SplitContainer = this.focusedTab
    let child: BaseTabComponent | SplitContainer | null = this.focusedTab
    let container: SplitContainer | null = null

    while (true) {
        const parent = this.getParentOf(current)
        if (!parent) return
        child = current
        current = parent
        if (current instanceof SplitContainer && current.orientation === directionvh) {
            container = current
            break
        }
    }

    if (!container || !child) return

    const index = container.children.indexOf(child)
    const currentRatio = container.ratios[index]
    const updatedRatio = isDecreasing ? currentRatio - resizeStep : currentRatio + resizeStep

    if (updatedRatio < 0 || updatedRatio > 1) return

    container.ratios[index] = updatedRatio
    this.layout()
}
