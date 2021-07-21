import { Directive, Input, OnInit } from '@angular/core'
import { CdkDropList } from '@angular/cdk/drag-drop'

class FakeDropGroup {
    _items: Set<CdkDropList> = new Set()
}

/** @hidden */
@Directive({
    selector: '[cdkAutoDropGroup]',
})
export class CdkAutoDropGroup implements OnInit {
    static groups: Record<string, FakeDropGroup> = {}

    @Input('cdkAutoDropGroup') groupName: string

    constructor (
        private cdkDropList: CdkDropList,
    ) { }

    ngOnInit (): void {
        CdkAutoDropGroup.groups[this.groupName] ??= new FakeDropGroup()
        CdkAutoDropGroup.groups[this.groupName]._items.add(this.cdkDropList)
        this.cdkDropList['_group'] = CdkAutoDropGroup.groups[this.groupName]
    }
}
