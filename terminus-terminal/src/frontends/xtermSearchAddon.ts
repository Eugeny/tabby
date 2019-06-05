/**
* Copyright (c) 2017 The xterm.js authors. All rights reserved.
* @license MIT
*/

import { Terminal, IDisposable, ITerminalAddon } from 'xterm'

export interface ISearchOptions {
    regex?: boolean
    wholeWord?: boolean
    caseSensitive?: boolean
    incremental?: boolean
}

export interface ISearchResult {
    term: string
    col: number
    row: number
}

const NON_WORD_CHARACTERS = ' ~!@#$%^&*()+`-=[]{}|\;:"\',./<>?'
const LINES_CACHE_TIME_TO_LIVE = 15 * 1000 // 15 secs

export class SearchAddon implements ITerminalAddon {
    private _terminal: Terminal | undefined

    private _linesCache: string[] | undefined
    private _linesCacheTimeoutId = 0
    private _cursorMoveListener: IDisposable | undefined
    private _resizeListener: IDisposable | undefined

    public activate (terminal: Terminal): void {
        this._terminal = terminal
    }

    public dispose (): void {}

    public findNext (term: string, searchOptions?: ISearchOptions): boolean {
        if (!this._terminal) {
            throw new Error('Cannot use addon until it has been loaded')
        }

        if (!term || term.length === 0) {
            this._terminal.clearSelection()
            return false
        }

        let startCol: number = 0
        let startRow = this._terminal.buffer.viewportY

        if (this._terminal.hasSelection()) {
            const incremental = searchOptions ? searchOptions.incremental : false
            // Start from the selection end if there is a selection
            // For incremental search, use existing row
            const currentSelection = this._terminal.getSelectionPosition()!
            startRow = incremental ? currentSelection.startRow : currentSelection.endRow
            startCol = incremental ? currentSelection.startColumn : currentSelection.endColumn
        }

        this._initLinesCache()

        // A row that has isWrapped = false
        let findingRow = startRow
        // index of beginning column that _findInLine need to scan.
        let cumulativeCols = startCol
        // If startRow is wrapped row, scan for unwrapped row above.
        // So we can start matching on wrapped line from long unwrapped line.
        let currentLine = this._terminal.buffer.getLine(findingRow)
        while (currentLine && currentLine.isWrapped) {
            cumulativeCols += this._terminal.cols
            currentLine = this._terminal.buffer.getLine(--findingRow)
        }

        // Search startRow
        let result = this._findInLine(term, findingRow, cumulativeCols, searchOptions)

        // Search from startRow + 1 to end
        if (!result) {

            for (let y = startRow + 1; y < this._terminal.buffer.baseY + this._terminal.rows; y++) {

                // If the current line is wrapped line, increase index of column to ignore the previous scan
                // Otherwise, reset beginning column index to zero with set new unwrapped line index
                result = this._findInLine(term, y, 0, searchOptions)
                if (result) {
                    break
                }
            }
        }

        // Search from the top to the startRow (search the whole startRow again in
        // case startCol > 0)
        if (!result) {
            for (let y = 0; y < findingRow; y++) {
                result = this._findInLine(term, y, 0, searchOptions)
                if (result) {
                    break
                }
            }
        }

        // Set selection and scroll if a result was found
        return this._selectResult(result)
    }

    public findPrevious (term: string, searchOptions?: ISearchOptions): boolean {
        if (!this._terminal) {
            throw new Error('Cannot use addon until it has been loaded')
        }

        if (!term || term.length === 0) {
            this._terminal.clearSelection()
            return false
        }

        const isReverseSearch = true
        let startRow = this._terminal.buffer.viewportY + this._terminal.rows - 1
        let startCol = this._terminal.cols

        if (this._terminal.hasSelection()) {
            // Start from the selection start if there is a selection
            const currentSelection = this._terminal.getSelectionPosition()!
            startRow = currentSelection.startRow
            startCol = currentSelection.startColumn
        }

        this._initLinesCache()

        // Search startRow
        let result = this._findInLine(term, startRow, startCol, searchOptions, isReverseSearch)

        // Search from startRow - 1 to top
        if (!result) {
            // If the line is wrapped line, increase number of columns that is needed to be scanned
            // Se we can scan on wrapped line from unwrapped line
            let cumulativeCols = this._terminal.cols
            if (this._terminal.buffer.getLine(startRow)!.isWrapped) {
                cumulativeCols += startCol
            }
            for (let y = startRow - 1; y >= 0; y--) {
                result = this._findInLine(term, y, cumulativeCols, searchOptions, isReverseSearch)
                if (result) {
                    break
                }
                // If the current line is wrapped line, increase scanning range,
                // preparing for scanning on unwrapped line
                const line = this._terminal.buffer.getLine(y)
                if (line && line.isWrapped) {
                    cumulativeCols += this._terminal.cols
                } else {
                    cumulativeCols = this._terminal.cols
                }
            }
        }

        // Search from the bottom to startRow (search the whole startRow again in
        // case startCol > 0)
        if (!result) {
            const searchFrom = this._terminal.buffer.baseY + this._terminal.rows - 1
            let cumulativeCols = this._terminal.cols
            for (let y = searchFrom; y >= startRow; y--) {
                result = this._findInLine(term, y, cumulativeCols, searchOptions, isReverseSearch)
                if (result) {
                    break
                }
                const line = this._terminal.buffer.getLine(y)
                if (line && line.isWrapped) {
                    cumulativeCols += this._terminal.cols
                } else {
                    cumulativeCols = this._terminal.cols
                }
            }
        }

        // Set selection and scroll if a result was found
        return this._selectResult(result)
    }

    private _initLinesCache (): void {
        const terminal = this._terminal!
        if (!this._linesCache) {
            this._linesCache = new Array(terminal.buffer.length)
            this._cursorMoveListener = terminal.onCursorMove(() => this._destroyLinesCache())
            this._resizeListener = terminal.onResize(() => this._destroyLinesCache())
        }

        window.clearTimeout(this._linesCacheTimeoutId)
        this._linesCacheTimeoutId = window.setTimeout(() => this._destroyLinesCache(), LINES_CACHE_TIME_TO_LIVE)
    }

    private _destroyLinesCache (): void {
        this._linesCache = undefined
        if (this._cursorMoveListener) {
            this._cursorMoveListener.dispose()
            this._cursorMoveListener = undefined
        }
        if (this._resizeListener) {
            this._resizeListener.dispose()
            this._resizeListener = undefined
        }
        if (this._linesCacheTimeoutId) {
            window.clearTimeout(this._linesCacheTimeoutId)
            this._linesCacheTimeoutId = 0
        }
    }

    private _isWholeWord (searchIndex: number, line: string, term: string): boolean {
        return (((searchIndex === 0) || (NON_WORD_CHARACTERS.indexOf(line[searchIndex - 1]) !== -1)) &&
        (((searchIndex + term.length) === line.length) || (NON_WORD_CHARACTERS.indexOf(line[searchIndex + term.length]) !== -1)))
    }

    protected _findInLine (term: string, row: number, col: number, searchOptions: ISearchOptions = {}, isReverseSearch: boolean = false): ISearchResult | undefined {
        const terminal = this._terminal!

        // Ignore wrapped lines, only consider on unwrapped line (first row of command string).
        const firstLine = terminal.buffer.getLine(row)
        if (firstLine && firstLine.isWrapped) {
            return null
        }
        let stringLine = this._linesCache ? this._linesCache[row] : void 0
        if (stringLine === void 0) {
            stringLine = this._translateBufferLineToStringWithWrap(row, true)
            if (this._linesCache) {
                this._linesCache[row] = stringLine
            }
        }

        const searchTerm = searchOptions.caseSensitive ? term : term.toLowerCase()
        const searchStringLine = searchOptions.caseSensitive ? stringLine : stringLine.toLowerCase()

        let resultIndex = -1
        if (searchOptions.regex) {
            const searchRegex = RegExp(searchTerm, 'g')
            let foundTerm: RegExpExecArray | null
            if (isReverseSearch) {
                // This loop will get the resultIndex of the _last_ regex match in the range 0..col
                while (foundTerm = searchRegex.exec(searchStringLine.slice(0, col))) {
                    resultIndex = searchRegex.lastIndex - foundTerm[0].length
                    term = foundTerm[0]
                    searchRegex.lastIndex -= (term.length - 1)
                }
            } else {
                foundTerm = searchRegex.exec(searchStringLine.slice(col))
                if (foundTerm && foundTerm[0].length > 0) {
                    resultIndex = col + (searchRegex.lastIndex - foundTerm[0].length)
                    term = foundTerm[0]
                }
            }
        } else {
            if (isReverseSearch) {
                if (col - searchTerm.length >= 0) {
                    resultIndex = searchStringLine.lastIndexOf(searchTerm, col - searchTerm.length)
                }
            } else {
                resultIndex = searchStringLine.indexOf(searchTerm, col)
            }
        }

        if (resultIndex >= 0) {
            // Adjust the row number and search index if needed since a "line" of text can span multiple rows
            if (resultIndex >= terminal.cols) {
                row += Math.floor(resultIndex / terminal.cols)
                resultIndex = resultIndex % terminal.cols
            }
            if (searchOptions.wholeWord && !this._isWholeWord(resultIndex, searchStringLine, term)) {
                return null
            }

            const line = terminal.buffer.getLine(row)

            if (line) {
                for (let i = 0; i < resultIndex; i++) {
                    const cell = line.getCell(i)
                    if (!cell) {
                        break
                    }
                    // Adjust the searchIndex to normalize emoji into single chars
                    const char = cell.char
                    if (char.length > 1) {
                        resultIndex -= char.length - 1
                    }
                    // Adjust the searchIndex for empty characters following wide unicode
                    // chars (eg. CJK)
                    const charWidth = cell.width
                    if (charWidth === 0) {
                        resultIndex++
                    }
                }
            }
            return {
                term,
                col: resultIndex,
                row
            }
        }
        return null
    }

    private _translateBufferLineToStringWithWrap (lineIndex: number, trimRight: boolean): string {
        const terminal = this._terminal!
        let lineString = ''
        let lineWrapsToNext: boolean

        do {
            const nextLine = terminal.buffer.getLine(lineIndex + 1)
            lineWrapsToNext = nextLine ? nextLine.isWrapped : false
            const line = terminal.buffer.getLine(lineIndex)
            if (!line) {
                break
            }
            lineString += line.translateToString(!lineWrapsToNext && trimRight).substring(0, terminal.cols)
            lineIndex++
        } while (lineWrapsToNext)

        return lineString
    }

    private _selectResult (result: ISearchResult | undefined): boolean {
        const terminal = this._terminal!
        if (!result) {
            terminal.clearSelection()
            return false
        }
        terminal.select(result.col, result.row, result.term.length)
        terminal.scrollLines(result.row - terminal.buffer.viewportY)
        return true
    }
}
