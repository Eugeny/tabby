export abstract class LinkHandler {
    regex: string
    convert (uri: string): string { return uri }
    verify (_uri: string): boolean { return true }
    abstract handle (uri: string): void
}
