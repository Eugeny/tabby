export interface SelectorOption<T> {
    name: string
    description?: string
    result?: T
    icon?: string
    freeInputPattern?: string
    color?: string
    callback?: (string?) => void
}
