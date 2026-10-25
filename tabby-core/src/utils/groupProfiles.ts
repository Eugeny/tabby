/**
 * Distribute profiles among configured groups without scanning every profile
 * for every group. The caller supplies cloned groups, so attaching the
 * `profiles` arrays does not modify the groups stored in config.yaml.
 *
 * Compatibility with the former per-group `filter` implementation is important:
 * - Profiles retain their original order inside each group.
 * - If group IDs are duplicated, the first group consumes the matching profiles;
 *   later groups with that ID stay empty.
 * - Missing, empty, or unknown group IDs are handled as before. In particular,
 *   an empty string is a real group ID, not a substitute for an absent group.
 * - Profiles that match no group remain in their original order, allowing the
 *   caller to place them into its existing Built-in/Ungrouped buckets.
 *
 * Time: O(profiles + groups), instead of repeated O(profiles * groups) scans.
 * Extra space: O(profiles + groups) for the index and consumed ID set.
 */
export function distributeProfilesByGroup<
    T extends { group?: string },
    G extends { id: string, profiles?: T[] },
> (profiles: T[], groups: G[]): T[] {
    // Build each group's ordered bucket once. Preserve the profile objects:
    // their identity and provider-specific fields must not be changed here.
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

    // `filter` previously removed matches after processing each group. Track
    // consumed IDs so a repeated group ID cannot receive the same profiles.
    const consumedGroupIds = new Set<string>()
    for (const group of groups) {
        group.profiles = consumedGroupIds.has(group.id)
            ? []
            : (profilesByGroup.get(group.id) ?? [])
        consumedGroupIds.add(group.id)
    }

    // Do not discard built-ins, ungrouped entries or profiles whose old group
    // was deleted: the caller's existing post-processing still needs them.
    return profiles.filter(profile => profile.group === undefined || !consumedGroupIds.has(profile.group))
}
