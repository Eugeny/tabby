import { Component, ChangeDetectionStrategy, trigger, style, animate, transition, state } from '@angular/core'
import { HotkeysService, PartialHotkeyMatch } from 'services/hotkeys'


@Component({
  selector: 'hotkey-hint',
  template: require('./hotkeyHint.pug'),
  styles: [require('./hotkeyHint.less')],
  //changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
      trigger('animateLine', [
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
              style({'height': '*'}),
              animate('250ms ease-in', style({
                  'transform': 'translateX(25px)',
                  'opacity': '0',
                  'height': '0',
              }))
          ])
      ])
  ]
})
export class HotkeyHintComponent {
    partialHotkeyMatches: PartialHotkeyMatch[]
    private keyTimeoutInterval: NodeJS.Timer = null

    constructor (
        public hotkeys: HotkeysService,
    ) {
        this.hotkeys.key.subscribe(() => {
            let partialMatches = this.hotkeys.getCurrentPartiallyMatchedHotkeys()
            if (partialMatches.length > 0) {
                console.log('Partial matches:', partialMatches)
                this.partialHotkeyMatches = partialMatches

                if (this.keyTimeoutInterval == null) {
                    this.keyTimeoutInterval = setInterval(() => {
                        if (this.hotkeys.getCurrentPartiallyMatchedHotkeys().length == 0) {
                            clearInterval(this.keyTimeoutInterval)
                            this.keyTimeoutInterval = null
                            this.partialHotkeyMatches = null
                        }
                    }, 500)
                }
            }
        })
    }
}
