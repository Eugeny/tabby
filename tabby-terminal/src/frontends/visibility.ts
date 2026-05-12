export interface VisibilityManagedTerminalFrontend {
    reactivateAfterVisibilityChange (): void
    deactivateAfterVisibilityChange (): void
}

export function syncTerminalVisibility (frontend: VisibilityManagedTerminalFrontend, visible: boolean): void {
    if (visible) {
        frontend.reactivateAfterVisibilityChange()
    } else {
        frontend.deactivateAfterVisibilityChange()
    }
}
