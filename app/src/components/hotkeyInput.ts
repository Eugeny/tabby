import { Component, Input, Output, EventEmitter, HostListener, ChangeDetectionStrategy } from '@angular/core'
import { ModalService } from 'services/modal'
import { HotkeyInputModalComponent } from './hotkeyInputModal'


@Component({
  selector: 'hotkey-input',
  template: `
    <hotkey-display [model]='model'></hotkey-display>
  `,
  styles: [require('./hotkeyInput.less')],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HotkeyInputComponent {
    constructor(
        private modal: ModalService,
    ) { }

    @HostListener('click') public click() {
        this.modal.open(HotkeyInputModalComponent).result.then((value: string[]) => {
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
