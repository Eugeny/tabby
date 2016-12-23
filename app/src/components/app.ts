import { Component, ElementRef } from '@angular/core'
import { ModalService } from 'services/modal'
import { ElectronService } from 'services/electron'
import { HostAppService } from 'services/hostApp'
import { LogService } from 'services/log'
import { QuitterService } from 'services/quitter'
import { ToasterConfig } from 'angular2-toaster'

import { SettingsModalComponent } from 'components/settingsModal'

import 'angular2-toaster/lib/toaster.css'
import 'global.less'

const hterm = require('hterm-commonjs')
var pty = require('pty.js');


@Component({
    selector: 'app',
    template: require('./app.pug'),
    styles: [require('./app.less')],
})
export class AppComponent {
    constructor(
        private hostApp: HostAppService,
        private modal: ModalService,
        private electron: ElectronService,
        element: ElementRef,
        log: LogService,
        _quitter: QuitterService,
    ) {
        console.timeStamp('AppComponent ctor')

        let logger = log.create('main')
        logger.info('ELEMENTS client', electron.app.getVersion())

        this.toasterConfig = new ToasterConfig({
            mouseoverTimerStop: true,
            preventDuplicates: true,
            timeout: 4000,
        })
    }

    toasterConfig: ToasterConfig

    ngOnInit () {
        let io
                hterm.hterm.defaultStorage = new hterm.lib.Storage.Memory()
                let t = new hterm.hterm.Terminal()
                t.onTerminalReady = function() {
                t.installKeyboard()
                  io = t.io.push();
                  //#t.decorate(element.nativeElement);

                  var cmd = pty.spawn('bash', [], {
                    name: 'xterm-color',
                    cols: 80,
                    rows: 30,
                    cwd: process.env.HOME,
                    env: process.env
                  });
                  cmd.on('data', function(data) {
                    io.writeUTF8(data);
                    });


                    io.onVTKeystroke = function(str) {
                        cmd.write(str)
                    };
                    io.sendString = function(str) {
                        cmd.write(str)
                    };
                    io.onTerminalResize = function(columns, rows) {
                        cmd.resize(columns, rows)
                    };
                };
                console.log(document.querySelector('#term'))
                t.decorate(document.querySelector('#term'));
    }

    ngOnDestroy () {
    }

    showSettings() {
        this.modal.open(SettingsModalComponent)
    }
}
