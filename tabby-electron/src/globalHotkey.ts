/** Translate Tabby's recorded key names into Electron accelerator syntax. */
export function toElectronAccelerator (keystroke: string): string {
    // Non-US layouts can report the physical Backquote key as §, œ, or a dead
    // key. The recorder keeps its code, but Electron accepts the punctuation.
    return keystroke
        .replace(/(^|[-+])Backquote$/, '$1`')
        .replaceAll('Meta', 'Super')
        .replaceAll('⌘', 'Command')
        .replaceAll('⌥', 'Alt')
        .replaceAll('-', '+')
}
