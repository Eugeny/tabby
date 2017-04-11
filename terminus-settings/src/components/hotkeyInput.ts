import { Component, Input, Output, EventEmitter, HostListener, ChangeDetectionStrategy } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'

import { HotkeyInputModalComponent } from './hotkeyInputModal'


@Component({
  selector: 'hotkey-input',
  template: `
    <hotkey-display [model]='model'></hotkey-display>
  `,
  styles: [require('./hotkeyInput.scss')],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HotkeyInputComponent {
    constructor(
        private ngbModal: NgbModal,
    ) { }

    @HostListener('click') public click() {
        this.ngbModal.open(HotkeyInputModalComponent).result.then((value: string[]) => {
            this.model = value
            this.modelChange.emit(this.model)
        })
    }

    splitKeys(keys: string): string[] {
        return keys.split('+').map((x) => x.trim())
    }

    @Input() model: string[]
    @Output() modelChange = new EventEmitter()
}
