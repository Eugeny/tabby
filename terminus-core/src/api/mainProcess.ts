export const BOOTSTRAP_DATA = 'BOOTSTRAP_DATA'

export interface BootstrapData {
    config: Record<string, any>
    executable: string
    isFirstWindow: boolean
    windowID: number
}
