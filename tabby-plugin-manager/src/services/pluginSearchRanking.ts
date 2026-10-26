/** The fields required to rank available plugins, independent of the UI. */
interface SearchablePlugin {
    name: string
    packageName: string
    description?: string
    searchScore?: number
}

/** Normalize names, package names, descriptions and queries consistently. */
function normalize (value: string): string {
    return value.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim()
        .replace(/\s+/g, ' ')
}

function matchesAllTerms (terms: string[], words: string[]): boolean {
    return terms.every(term => words.some(word => word.startsWith(term)))
}

/** Lower ranks are more relevant. The npm score only breaks ties. */
function matchRank (plugin: SearchablePlugin, query: string, terms: string[]): number {
    const name = normalize(plugin.name)
    const packageName = normalize(plugin.packageName)
    const description = normalize(plugin.description ?? '')
    const names = [name, packageName]

    if (names.some(text => text === query)) {
        return 0
    }
    if (names.some(text => text.startsWith(query))) {
        return 1
    }
    if (names.some(text => text.includes(query))) {
        return 2
    }

    const nameWords = name.split(' ')
    if (matchesAllTerms(terms, nameWords)) {
        return 3
    }
    if (description.includes(query)) {
        return 4
    }
    if (matchesAllTerms(terms, [...nameWords, ...description.split(' ')])) {
        return 5
    }
    return 6
}

function npmScore (plugin: SearchablePlugin): number {
    return typeof plugin.searchScore === 'number' && Number.isFinite(plugin.searchScore)
        ? plugin.searchScore : 0
}

/**
 * Without a query, preserve npm's score-first ordering. With a query, put
 * textual matches first and use npm's score to rank equally relevant matches.
 * Never mutate the supplied list.
 */
export function sortPluginsByRelevance<T extends SearchablePlugin> (plugins: readonly T[], query?: string): T[] {
    const search = normalize(query ?? '')
    const terms = search ? search.split(' ') : []

    const ranked = plugins.map(plugin => ({
        plugin,
        rank: search ? matchRank(plugin, search, terms) : 0,
        score: npmScore(plugin),
    }))

    ranked.sort((a, b) =>
        a.rank - b.rank ||
        b.score - a.score ||
        a.plugin.name.localeCompare(b.plugin.name) ||
        a.plugin.packageName.localeCompare(b.plugin.packageName),
    )
    return ranked.map(item => item.plugin)
}
