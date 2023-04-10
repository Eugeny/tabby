/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker'
import axios from 'axios'
import * as marked from '../../node_modules/marked/src/marked'
import { Component, Injector } from '@angular/core'
import { BaseTabComponent, TranslateService } from 'tabby-core'

export interface Release {
    name: string
    version: string
    content: string
    date: Date
}

/** @hidden */
@Component({
    selector: 'release-notes-tab',
    templateUrl: './releaseNotesTab.component.pug',
    styleUrls: ['./releaseNotesTab.component.scss'],
})
export class ReleaseNotesComponent extends BaseTabComponent {
    releases: Release[] = []
    lastPage = 1

    constructor (translate: TranslateService, injector: Injector) {
        super(injector)
        this.setTitle(translate.instant(_('Release notes')))
        this.loadReleases(1)
    }

    async loadReleases (page) {
        console.log('Loading releases page', page)
        const response = await axios.get(`https://api.github.com/repos/eugeny/tabby/releases?page=${page}`, {
            headers: { Accept: 'application/vnd.github.v3+json' },
        })
        this.releases = this.releases.concat(response.data.map(r => ({
            name: r.name,
            version: r.tag_name,
            content: marked.marked(r.body),
            date: new Date(r.created_at),
        })))
        this.lastPage = page
    }

    onScrolled () {
        this.loadReleases(this.lastPage + 1)
    }
}
