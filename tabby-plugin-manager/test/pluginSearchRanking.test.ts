import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { sortPluginsByRelevance } from '../src/services/pluginSearchRanking.ts'

interface Plugin {
    name: string
    packageName: string
    description: string
    searchScore?: number
}

function plugin (name: string, searchScore?: number, description = '', packageName = 'tabby-' + name): Plugin {
    return { name, packageName, description, searchScore }
}

function names (plugins: Plugin[]): string[] {
    return plugins.map(x => x.name)
}

describe('available plugin search ranking', () => {
    it('sorts by npm score with an empty, omitted or whitespace-only query', () => {
        const plugins = [plugin('low', 1), plugin('high', 100), plugin('middle', 50)]
        for (const query of [undefined, '', '   ']) {
            assert.deepEqual(names(sortPluginsByRelevance(plugins, query)), ['high', 'middle', 'low'])
        }
    })

    it('does not change its input list', () => {
        const plugins = [plugin('other', 200), plugin('profile-share', 5)]
        const result = sortPluginsByRelevance(plugins, 'profile')
        assert.deepEqual(names(result), ['profile-share', 'other'])
        assert.deepEqual(names(plugins), ['other', 'profile-share'])
        assert.notStrictEqual(result, plugins)
    })

    it('ranks an exact display name above prefixes, infixes and higher npm scores', () => {
        const plugins = [
            plugin('my-profile-share', 100),
            plugin('profile-share-tools', 200),
            plugin('profile-share', 1),
        ]
        assert.deepEqual(names(sortPluginsByRelevance(plugins, 'profile-share')), [
            'profile-share', 'profile-share-tools', 'my-profile-share',
        ])
    })

    it('recognizes the full npm package name as an exact match', () => {
        const plugins = [plugin('profile-share-extra', 300), plugin('profile-share', 1)]
        assert.deepEqual(names(sortPluginsByRelevance(plugins, 'tabby-profile-share')), [
            'profile-share', 'profile-share-extra',
        ])
    })

    it('prioritizes a name containing the phrase over separated words and descriptions', () => {
        const plugins = [
            plugin('connection-manager', 500, 'Profile share and export'),
            plugin('share-my-profile', 400),
            plugin('my-profile-share', 1),
        ]
        assert.deepEqual(names(sortPluginsByRelevance(plugins, 'profile share')), [
            'my-profile-share', 'share-my-profile', 'connection-manager',
        ])
    })

    it('prioritizes a description phrase over separate matches across fields', () => {
        const plugins = [
            plugin('profile-tools', 90, 'Export and share sessions'),
            plugin('session-tools', 1, 'Import and export profile share formats'),
        ]
        assert.deepEqual(names(sortPluginsByRelevance(plugins, 'profile share')), [
            'session-tools', 'profile-tools',
        ])
        assert.deepEqual(names(sortPluginsByRelevance(plugins, 'export profile share')), [
            'session-tools', 'profile-tools',
        ])
    })

    it('supports partial terms, case, accent marks and punctuation', () => {
        const plugins = [plugin('profile-share', 1), plugin('theme-manager', 300)]
        assert.equal(sortPluginsByRelevance(plugins, 'PrÓfILE_shAr')[0].name, 'profile-share')
        assert.equal(sortPluginsByRelevance(plugins, 'PROFILE SHARE')[0].name, 'profile-share')
    })

    it('uses npm scores within a relevance tier and alphabetical ties', () => {
        const plugins = [
            plugin('profile-b', 20),
            plugin('profile-a', 20),
            plugin('profile-c', 30),
        ]
        assert.deepEqual(names(sortPluginsByRelevance(plugins, 'profile')), [
            'profile-c', 'profile-a', 'profile-b',
        ])
    })

    it('handles missing and invalid npm scores', () => {
        const plugins = [
            plugin('plugin-z'),
            plugin('plugin-a', Number.NaN),
            plugin('plugin-b', 5),
        ]
        assert.deepEqual(names(sortPluginsByRelevance(plugins, '')), [
            'plugin-b', 'plugin-a', 'plugin-z',
        ])
    })

    it('keeps npm ranking for nonmatching search results', () => {
        const plugins = [plugin('terminal', 100), plugin('color-scheme', 5)]
        assert.deepEqual(names(sortPluginsByRelevance(plugins, 'ssh')), ['terminal', 'color-scheme'])
    })
})
