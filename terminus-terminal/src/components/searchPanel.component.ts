import { Component, Input, Output, EventEmitter } from '@angular/core'
import { ToastrService } from 'ngx-toastr'
import { Frontend, ISearchOptions } from '../frontends/frontend'

@Component({
    selector: 'search-panel',
    template: require('./searchPanel.component.pug'),
    styles: [require('./searchPanel.component.scss')],
})
export class SearchPanelComponent {
    @Input() query: string
    @Input() frontend: Frontend
    notFound = false
    static globalOptions: ISearchOptions = {}
    options: ISearchOptions = SearchPanelComponent.globalOptions

    @Output() close = new EventEmitter()

    constructor (
        private toastr: ToastrService,
    ) { }

    findNext () {
        if (!this.frontend.findNext(this.query, this.options)) {
            this.notFound = true
            this.toastr.error('Not found')
        }
    }

    findPrevious () {
        if (!this.frontend.findPrevious(this.query, this.options)) {
            this.notFound = true
            this.toastr.error('Not found')
        }
    }
}
