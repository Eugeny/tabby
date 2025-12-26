/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Input } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { Observable, OperatorFunction, debounceTime, map, distinctUntilChanged } from 'rxjs'
import { ConfigProxy, ProfileGroup, Profile, ProfileProvider, PlatformService, TranslateService, PartialProfileGroup, ProfilesService, TAB_COLORS } from 'tabby-core'

const iconsData = require('../../../tabby-core/src/icons.json')
const iconsClassList = Object.keys(iconsData).map(
    icon => iconsData[icon].map(
        style => `fa${style[0]} fa-${icon}`,
    ),
).flat()

/** @hidden */
@Component({
    templateUrl: './editProfileGroupModal.component.pug',
})
export class EditProfileGroupModalComponent<G extends ProfileGroup> {
    @Input() group: G & ConfigProxy
    @Input() providers: ProfileProvider<Profile>[]
    @Input() selectedParentGroup: PartialProfileGroup<ProfileGroup> | undefined
    groups: PartialProfileGroup<ProfileGroup>[]

    getValidParents (groups: PartialProfileGroup<ProfileGroup>[], targetId: string): PartialProfileGroup<ProfileGroup>[] {
        // Build a quick lookup: parentGroupId -> [child groups]
        const childrenMap = new Map<string | null, string[]>()
        for (const group of groups) {
            const parent = group.parentGroupId ?? null
            if (!childrenMap.has(parent)) {
                childrenMap.set(parent, [])
            }
            childrenMap.get(parent)!.push(group.id)
        }

        // Depth-first search to find all descendants of target
        function getDescendants (id: string): Set<string> {
            const descendants = new Set<string>()
            const stack: string[] = [id]

            while (stack.length > 0) {
                const current = stack.pop()!
                const children = childrenMap.get(current)
                if (children) {
                    for (const child of children) {
                        if (!descendants.has(child)) {
                            descendants.add(child)
                            stack.push(child)
                        }
                    }
                }
            }
            return descendants
        }

        const descendants = getDescendants(targetId)

        // Valid parents = all groups that are not the target or its descendants
        return groups.filter((g) => g.id !== targetId && !descendants.has(g.id))
    }

    constructor (
        private modalInstance: NgbActiveModal,
        private profilesService: ProfilesService,
        private platform: PlatformService,
        private translate: TranslateService,
    ) {
        this.profilesService.getProfileGroups().then(groups => {
            this.groups = this.getValidParents(groups, this.group.id)
            this.selectedParentGroup = groups.find(g => g.id === this.group.parentGroupId) ?? undefined
        })
    }

    colorsAutocomplete = text$ => text$.pipe(
        debounceTime(200),
        distinctUntilChanged(),
        map((q: string) =>
            TAB_COLORS
                .filter(x => !q || x.name.toLowerCase().startsWith(q.toLowerCase()))
                .map(x => x.value),
        ),
    )

    colorsFormatter = value => {
        return TAB_COLORS.find(x => x.value === value)?.name ?? value
    }

    groupTypeahead: OperatorFunction<string, readonly PartialProfileGroup<ProfileGroup>[]> = (text$: Observable<string>) =>
        text$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            map(q => this.groups.filter(g => !q || g.name.toLowerCase().includes(q.toLowerCase()))),
        )

    groupFormatter = (g: PartialProfileGroup<ProfileGroup>) => g.name

    iconSearch: OperatorFunction<string, string[]> = (text$: Observable<string>) =>
        text$.pipe(
            debounceTime(200),
            map(term => iconsClassList.filter(v => v.toLowerCase().includes(term.toLowerCase())).slice(0, 10)),
        )

    async save () {
        if (!this.selectedParentGroup) {
            this.group.parentGroupId = undefined
        } else {
            this.group.parentGroupId = this.selectedParentGroup.id
        }

        if (this.group.id === 'new') {
            await this.profilesService.newProfileGroup(this.group, { genId: true })
        }
        this.modalInstance.close({ group: this.group })
    }

    cancel () {
        this.modalInstance.dismiss()
    }

    editDefaults (provider: ProfileProvider<Profile>) {
        this.modalInstance.close({ group: this.group, provider })
    }

    async deleteDefaults (provider: ProfileProvider<Profile>): Promise<void> {
        if ((await this.platform.showMessageBox(
            {
                type: 'warning',
                message: this.translate.instant('Restore settings to inherited defaults ?'),
                buttons: [
                    this.translate.instant('Delete'),
                    this.translate.instant('Keep'),
                ],
                defaultId: 1,
                cancelId: 1,
            },
        )).response === 0) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete this.group.defaults?.[provider.id]
        }
    }
}

export interface EditProfileGroupModalComponentResult<G extends ProfileGroup> {
    group: G
    provider?: ProfileProvider<Profile>
}
