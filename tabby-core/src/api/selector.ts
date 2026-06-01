export interface SelectorOption<T> {
    name: string
    description?: string
    group?: string
    result?: T
    icon?: string
    freeInputPattern?: string
    freeInputPlacement?: 'top'|'bottom'
    freeInputEquivalent?: string
    color?: string
    weight?: number
    callback?: (string?) => void
}
