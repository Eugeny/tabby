import test from 'node:test'
import assert from 'node:assert/strict'
import { distributeProfilesByGroup } from '../src/utils/groupProfiles'

interface TestProfile {
    id: string
    group?: string
    isBuiltin?: boolean
}
interface TestGroup {
    id: string
    profiles?: TestProfile[]
}

// Reference model of the exact two-filter implementation in master.
// Run every behavior test against both implementations so refactoring cannot
// silently move profiles into the wrong groups or drop orphaned entries.
function originalDistribution (profiles: TestProfile[], groups: TestGroup[]): {
    grouped: TestGroup[], unmatched: TestProfile[]
} {
    let remaining = [...profiles]
    const grouped = groups.map(group => {
        const assigned = remaining.filter(profile => profile.group === group.id)
        remaining = remaining.filter(profile => profile.group !== group.id)
        return { ...group, profiles: assigned }
    })
    return { grouped, unmatched: remaining }
}

function assertSameAsOriginal (profiles: TestProfile[], groupIds: string[]): void {
    const originalProfiles = [...profiles]
    const originalGroups = groupIds.map(id => ({ id }))
    const optimizedGroups: TestGroup[] = groupIds.map(id => ({ id }))
    const expected = originalDistribution(profiles, originalGroups)
    const unmatched = distributeProfilesByGroup(profiles, optimizedGroups)

    assert.deepEqual(optimizedGroups, expected.grouped)
    assert.deepEqual(unmatched, expected.unmatched)
    // Group assignment must not sort/remove/replace the incoming profiles.
    assert.deepEqual(profiles, originalProfiles)
    assert.equal(profiles.length, originalProfiles.length)
}

test('preserves order for profiles in configured groups', () => {
    assertSameAsOriginal([
        { id: 'olt-1', group: 'pop-b' },
        { id: 'router-1', group: 'pop-a' },
        { id: 'olt-2', group: 'pop-b' },
    ], ['pop-a', 'pop-b'])
})

test('does not duplicate profiles when a group ID appears more than once', () => {
    assertSameAsOriginal([
        { id: 'olt-1', group: 'pop' },
        { id: 'olt-2', group: 'pop' },
    ], ['pop', 'pop'])
})

test('leaves orphaned and ungrouped profiles available for fallback groups', () => {
    assertSameAsOriginal([
        { id: 'no-group' },
        { id: 'deleted-pop', group: 'nonexistent' },
        { id: 'built-in', isBuiltin: true },
        { id: 'built-in-group', group: 'external-provider', isBuiltin: true },
        { id: 'regular', group: 'pop' },
    ], ['pop'])
})

test('distinguishes an empty group ID from an absent group ID', () => {
    assertSameAsOriginal([
        { id: 'absent' },
        { id: 'empty', group: '' },
        { id: 'present', group: 'pop' },
    ], ['', 'pop'])
})

test('handles no configured groups', () => {
    assertSameAsOriginal([
        { id: 'orphan', group: 'deleted' },
        { id: 'ungrouped' },
    ], [])
})

test('handles empty profile inventory', () => {
    assertSameAsOriginal([], ['group-a', 'group-b', 'group-a'])
})

test('preserves object identity within groups and unmatched entries', () => {
    const matched: TestProfile = { id: 'matched', group: 'pop' }
    const orphan: TestProfile = { id: 'orphan', group: 'deleted' }
    const groups: TestGroup[] = [{ id: 'pop' }]
    const remaining = distributeProfilesByGroup([matched, orphan], groups)
    assert.strictEqual(groups[0].profiles?.[0], matched)
    assert.strictEqual(remaining[0], orphan)
})

test('matches the original behavior for 10,000 profiles and 1,000 groups', () => {
    const groups = Array.from({ length: 1000 }, (_, i) => `group-${i}`)
    const profiles = Array.from({ length: 10000 }, (_, i) => ({
        id: `device-${i}`,
        group: `group-${i % 1000}`,
    }))
    assertSameAsOriginal(profiles, groups)
})

test('matches the reference for varied deterministic synthetic inventories', () => {
    let seed = 0x1234abcd
    const random = (): number => {
        // Reproducible tests, not production randomness.
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
        return seed
    }
    const groupIds = ['', 'north', 'south', 'missing', 'duplicate']
    for (let scenario = 0; scenario < 40; scenario++) {
        const selectedGroups = Array.from({ length: random() % 12 }, () => groupIds[random() % 4])
        const profiles = Array.from({ length: random() % 160 }, (_, i) => ({
            id: `profile-${scenario}-${i}`,
            group: random() % 5 === 0 ? undefined : groupIds[random() % groupIds.length],
            isBuiltin: random() % 2 === 0,
        }))
        assertSameAsOriginal(profiles, selectedGroups)
    }
})
