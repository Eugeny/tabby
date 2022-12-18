import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { HotkeyInputModalComponent } from './hotkeyInputModal.component'
import { Hotkey } from 'tabby-core/src/api/hotkeyProvider'

/** @hidden */
@Component({
    selector: 'multi-hotkey-input',
    template: require('./multiHotkeyInput.component.pug'),
    styles: [require('./multiHotkeyInput.component.scss')],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiHotkeyInputComponent {
    @Input() hotkeys: Hotkey[] = []
    @Output() hotkeysChange = new EventEmitter()

    constructor (
        private ngbModal: NgbModal,
    ) { }

    ngOnChanges (): void {
        this.hotkeys = this.hotkeys.map(hotkey => typeof hotkey.strokes === 'string' ? { ...hotkey, strokes: [hotkey.strokes] } : hotkey)
    }

    editItem (item: Hotkey): void {
        this.ngbModal.open(HotkeyInputModalComponent).result.then((newStrokes: string[]) => {
            this.hotkeys.find(hotkey => this.isEqual(hotkey, item))!.strokes = newStrokes
            this.storeUpdatedHotkeys()
        })
    }

    addItem (): void {
        this.ngbModal.open(HotkeyInputModalComponent).result.then((value: string[]) => {
            this.hotkeys.push({ strokes: value, isDuplicate: false })
            this.storeUpdatedHotkeys()
        })
    }

    removeItem (item: Hotkey): void {
        this.hotkeys = this.hotkeys.filter(x => x !== item)
        this.storeUpdatedHotkeys()
    }

    private storeUpdatedHotkeys () {
        this.hotkeysChange.emit(this.hotkeys)
    }

    private isEqual (h: Hotkey, item: Hotkey) {
        return JSON.stringify(h.strokes) === JSON.stringify(item.strokes)
    }
}
