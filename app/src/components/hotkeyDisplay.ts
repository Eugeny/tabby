import { Component, Input, ChangeDetectionStrategy, trigger, style, animate, transition, state } from '@angular/core'


@Component({
  selector: 'hotkey-display',
  template: require('./hotkeyDisplay.pug'),
  styles: [require('./hotkeyDisplay.less')],
  //changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
      trigger('animateKey', [
          state('in', style({
              'transform': 'translateX(0)',
              'opacity': '1',
          })),
          transition(':enter', [
              style({
                  'transform': 'translateX(25px)',
                  'opacity': '0',
              }),
              animate('250ms ease-out')
          ]),
          transition(':leave', [
              animate('250ms ease-in', style({
                  'transform': 'translateX(25px)',
                  'opacity': '0',
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
}
