import { Directive, Output, ElementRef, EventEmitter, AfterViewInit } from '@angular/core'
import { FileUpload, PlatformService } from '../api/platform'
import './dropZone.directive.scss'

/** @hidden */
@Directive({
    selector: '[dropZone]',
})
export class DropZoneDirective implements AfterViewInit {
    @Output() transfer = new EventEmitter<FileUpload>()
    private dropHint?: HTMLElement

    constructor (
        private el: ElementRef,
        private platform: PlatformService,
    ) { }

    ngAfterViewInit (): void {
        this.el.nativeElement.addEventListener('dragover', () => {
            if (!this.dropHint) {
                this.dropHint = document.createElement('div')
                this.dropHint.className = 'drop-zone-hint'
                this.dropHint.innerHTML = require('./dropZone.directive.pug')
                this.el.nativeElement.appendChild(this.dropHint)
                setTimeout(() => {
                    this.dropHint!.classList.add('visible')
                })
            }
        })
        this.el.nativeElement.addEventListener('drop', (event: DragEvent) => {
            this.removeHint()
            for (const transfer of this.platform.startUploadFromDragEvent(event, true)) {
                this.transfer.emit(transfer)
            }
        })
        this.el.nativeElement.addEventListener('dragleave', () => {
            this.removeHint()
        })
    }

    private removeHint () {
        const element = this.dropHint
        delete this.dropHint
        element?.classList.remove('visible')
        setTimeout(() => {
            element?.remove()
        }, 500)
    }
}
