/** Pure decision helper for the one-time tabby:// scheme registration at startup. */
export function shouldRegisterTabbyProtocol (platform: string, isDefaultProtocolClient: () => boolean): boolean {
    // On Linux Electron registers the scheme through the desktop's MIME settings.
    // Older xdg-utils versions also hijack text/html while doing so, so only
    // register when Tabby is not the handler yet: the very first launch still
    // sets up tabby:// links, but later launches never rewrite MIME defaults.
    if (platform === 'linux') {
        return !isDefaultProtocolClient()
    }
    // Preserve the existing behaviour on macOS and Windows.
    return true
}
