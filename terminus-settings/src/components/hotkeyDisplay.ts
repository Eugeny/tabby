import { Component, Input, trigger, style, animate, transition } from '@angular/core'


@Component({
    selector: 'hotkey-display',
    template: require('./hotkeyDisplay.pug'),
    styles: [require('./hotkeyDisplay.scss')],
    //changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        trigger('animateKey', [
            transition('void => in', [
                style({
                    transform: 'translateX(25px)',
                    opacity: '0',
                }),
                animate('250ms ease-out', style({
                    transform: 'translateX(0)',
                    opacity: '1',
                }))
            ]),
            transition('in => void', [
                style({
                    transform: 'translateX(0)',
                    opacity: '1',
                }),
                animate('250ms ease-in', style({
                    transform: 'translateX(25px)',
                    opacity: '0',
                }))
            ])
        ])
    ]
})
export class HotkeyDisplayComponent {
    splitKeys(keys: string): string[] {
        return keys.split('+').map((x) => x.trim())
    }

    @Input() model: string[]
    @Input() animate = false
}
