/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import axios from 'axios'
import marked from 'marked'
import { Component } from '@angular/core'
import { BaseTabComponent } from 'tabby-core'

export interface Release {
    name: string
    version: string
    content: string
    date: Date
}

/** @hidden */
@Component({
    selector: 'release-notes-tab',
    template: require('./releaseNotesTab.component.pug'),
    styles: [require('./releaseNotesTab.component.scss')],
})
export class ReleaseNotesComponent extends BaseTabComponent {
    releases: Release[] = []
    lastPage = 1

    constructor () {
        super()
        this.setTitle('Release notes')
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
            content: marked(r.body),
            date: new Date(r.created_at),
        })))
        this.lastPage = page
    }

    onScrolled () {
        this.loadReleases(this.lastPage + 1)
    }
}
