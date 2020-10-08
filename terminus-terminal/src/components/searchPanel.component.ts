import { Component, Input, Output, EventEmitter } from '@angular/core'
import { ToastrService } from 'ngx-toastr'
import { Frontend, SearchOptions } from '../frontends/frontend'
import { ConfigService } from 'terminus-core'

@Component({
    selector: 'search-panel',
    template: require('./searchPanel.component.pug'),
    styles: [require('./searchPanel.component.scss')],
})
export class SearchPanelComponent {
    @Input() query: string
    @Input() frontend: Frontend
    notFound = false
    options: SearchOptions = {
        incremental: true,
        regex: this.config.store.terminal.searchRegexAlwaysEnabled,
    }

    @Output() close = new EventEmitter()

    constructor (
        private toastr: ToastrService,
        public config: ConfigService,
    ) { }

    onQueryChange (): void {
        this.notFound = false
        this.findPrevious(true)
    }

    findNext (incremental = false): void {
        if (!this.query) {
            return
        }
        if (!this.frontend.findNext(this.query, { ...this.options, incremental: incremental || undefined })) {
            this.notFound = true
            this.toastr.error('Not found')
        }
    }

    findPrevious (incremental = false): void {
        if (!this.query) {
            return
        }
        if (!this.frontend.findPrevious(this.query, { ...this.options, incremental: incremental || undefined })) {
            this.notFound = true
            this.toastr.error('Not found')
        }
    }
}
