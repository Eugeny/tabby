import { Terminal } from '@xterm/xterm'
import { ISearchOptions, SearchAddon } from '@xterm/addon-search'
import { SearchOptions, SearchState } from './frontend'

/**
 * Manages search functionality for XTerm.js terminal
 */
export class XTermSearchManager {
    searchAddon: SearchAddon
    searchState: SearchState = { resultCount: 0 }

    constructor (
        private xterm: Terminal,
        private getIsCopyOnSelect: () => boolean,
        private preventNextSelectionEvent: () => void,
    ) {
        this.searchAddon = new SearchAddon()
        this.searchAddon.onDidChangeResults(state => {
            this.searchState = state
        })
    }

    /**
     * Get search options for xterm.js search
     */
    private getSearchOptions (searchOptions?: SearchOptions): ISearchOptions {
        return {
            ...searchOptions,
            decorations: {
                matchOverviewRuler: '#888888',
                activeMatchColorOverviewRuler: '#ffff00',
                matchBackground: '#888888',
                activeMatchBackground: '#ffff00',
            },
        }
    }

    /**
     * Wrap search result to provide SearchState
     */
    private wrapSearchResult (result: boolean): SearchState {
        if (!result) {
            return { resultCount: 0 }
        }
        return this.searchState
    }

    /**
     * Find next occurrence of search term
     */
    findNext (term: string, searchOptions?: SearchOptions): SearchState {
        if (this.getIsCopyOnSelect()) {
            this.preventNextSelectionEvent()
        }
        return this.wrapSearchResult(
            this.searchAddon.findNext(term, this.getSearchOptions(searchOptions)),
        )
    }

    /**
     * Find previous occurrence of search term
     */
    findPrevious (term: string, searchOptions?: SearchOptions): SearchState {
        if (this.getIsCopyOnSelect()) {
            this.preventNextSelectionEvent()
        }
        return this.wrapSearchResult(
            this.searchAddon.findPrevious(term, this.getSearchOptions(searchOptions)),
        )
    }

    /**
     * Cancel the current search
     */
    cancelSearch (): void {
        this.searchAddon.clearDecorations()
    }
}
