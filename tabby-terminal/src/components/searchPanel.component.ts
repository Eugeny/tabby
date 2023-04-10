import { Component, Input, Output, EventEmitter } from '@angular/core'
import { Subject, debounceTime } from 'rxjs'
import { Frontend, SearchOptions, SearchState } from '../frontends/frontend'
import { ConfigService, NotificationsService, TranslateService } from 'tabby-core'

@Component({
    selector: 'search-panel',
    templateUrl: './searchPanel.component.pug',
    styleUrls: ['./searchPanel.component.scss'],
})
export class SearchPanelComponent {
    @Input() query: string
    @Input() frontend: Frontend
    state: SearchState = { resultCount: 0 }
    options: SearchOptions = {
        incremental: true,
        ...this.config.store.terminal.searchOptions,
    }

    @Output() close = new EventEmitter()

    private queryChanged = new Subject<string>()

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
    ) {
        this.queryChanged.pipe(debounceTime(250)).subscribe(() => {
            this.findPrevious(true)
        })
    }

    onQueryChange (): void {
        this.state = { resultCount: 0 }
        this.queryChanged.next(this.query)
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
    }
}
