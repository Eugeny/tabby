import { Component, Input, Output, EventEmitter, NgZone, OnChanges, SimpleChange } from '@angular/core'
import { Subject, debounceTime } from 'rxjs'
import { Frontend, SearchOptions, SearchState } from '../frontends/frontend'
import { ConfigService, NotificationsService, TranslateService } from 'tabby-core'

@Component({
    selector: 'search-panel',
    templateUrl: './searchPanel.component.pug',
    styleUrls: ['./searchPanel.component.scss'],
})
export class SearchPanelComponent implements OnChanges {
    private savedQuery = ''
    @Input() query: string
    @Input() frontend: Frontend
    state: SearchState = { resultCount: 0 }
    options: SearchOptions = {
        incremental: true,
        ...this.config.store.terminal.searchOptions,
    }

    @Output() close = new EventEmitter()

    private queryChanged = new Subject<string>()
    private holdTimer: ReturnType<typeof setTimeout> | null = null
    private repeatTimer: ReturnType<typeof setInterval> | null = null

    private readonly HOLD_DELAY = 400
    private readonly REPEAT_INTERVAL = 40

    icons = {
        'case': require('../icons/case.svg'),
        regexp: require('../icons/regexp.svg'),
        wholeWord: require('../icons/whole-word.svg'),
        arrowUp: require('../icons/arrow-up.svg'),
        arrowDown: require('../icons/arrow-down.svg'),
        close: require('../icons/close.svg'),
    }

    constructor (
        private notifications: NotificationsService,
        private translate: TranslateService,
        public config: ConfigService,
        private ngZone: NgZone,
    ) {
        this.queryChanged.pipe(debounceTime(250)).subscribe(() => {
            this.findPrevious(true)
        })
    }

    onQueryChange (): void {
        this.state = { resultCount: 0 }
        this.queryChanged.next(this.query)
    }

    ngOnChanges (changes: { query?: SimpleChange }): void {
        if (changes.query) {
            if (this.savedQuery && !changes.query.currentValue) {
                // Parent cleared the query (e.g. tab regained focus) → restore
                this.query = this.savedQuery
            } else if (changes.query.currentValue) {
                this.savedQuery = changes.query.currentValue
            }
        }
    }

    onKeyDown (event: KeyboardEvent): void {
        if (event.key !== 'Enter' || event.repeat) { return }
        if (this.holdTimer ?? this.repeatTimer) { return }

        this.holdTimer = setTimeout(() => {
            this.holdTimer = null
            this.ngZone.runOutsideAngular(() => {
                this.repeatTimer = setInterval(() => {
                    this.ngZone.run(() => this.findPrevious())
                }, this.REPEAT_INTERVAL)
            })
        }, this.HOLD_DELAY)
    }

    private stopRepeat (fireOnTap = false): void {
        if (this.holdTimer) {
            clearTimeout(this.holdTimer)
            this.holdTimer = null
            if (fireOnTap) { this.findPrevious() }
        }
        if (this.repeatTimer) { clearInterval(this.repeatTimer); this.repeatTimer = null }
    }

    onKeyUp (event: KeyboardEvent): void {
        if (event.key !== 'Enter') { return }
        this.stopRepeat(true)
    }

    onBlur (): void {
        this.stopRepeat(false)
    }

    findNext (incremental = false): void {
        if (!this.query) {
            return
        }
        this.state = this.frontend.findNext(this.query, { ...this.options, incremental: incremental || undefined })
        if (!this.state.resultCount) {
            this.notifications.notice(this.translate.instant('Not found'))
        }
    }

    findPrevious (incremental = false): void {
        if (!this.query) {
            return
        }
        this.state = this.frontend.findPrevious(this.query, { ...this.options, incremental: incremental || undefined })
        if (!this.state.resultCount) {
            this.notifications.notice(this.translate.instant('Not found'))
        }
    }

    saveSearchOptions (): void {
        this.config.store.terminal.searchOptions.regex = this.options.regex
        this.config.store.terminal.searchOptions.caseSensitive = this.options.caseSensitive
        this.config.store.terminal.searchOptions.wholeWord = this.options.wholeWord

        this.config.save()
    }

    ngOnDestroy (): void {
        this.queryChanged.complete()
        this.stopRepeat()
    }
}
