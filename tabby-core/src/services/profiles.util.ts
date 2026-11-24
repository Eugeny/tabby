/**
 * Fills in `profiles` on each group in a single pass and returns the profiles
 * that belong to none of them, in their original order.
 * If a group ID is repeated, the first group gets the profiles.
 */
export function distributeProfilesByGroup<
    T extends { group?: string },
    G extends { id: string, profiles?: T[] },
> (profiles: T[], groups: G[]): T[] {
    const profilesByGroup = new Map<string, T[]>()
    for (const profile of profiles) {
        if (profile.group === undefined) {
            continue
        }

        const bucket = profilesByGroup.get(profile.group)
        if (bucket) {
            bucket.push(profile)
        } else {
            profilesByGroup.set(profile.group, [profile])
        }
    }

    const consumedGroupIds = new Set<string>()
    for (const group of groups) {
        group.profiles = consumedGroupIds.has(group.id)
            ? []
            : profilesByGroup.get(group.id) ?? []
        consumedGroupIds.add(group.id)
    }

    return profiles.filter(profile => profile.group === undefined || !consumedGroupIds.has(profile.group))
}
