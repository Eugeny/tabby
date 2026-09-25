// Lets `node --test` import Tabby's TypeScript sources directly. See test-hooks.mjs.
import * as nodeModule from 'node:module'
import * as hooks from './test-hooks.mjs'

if (nodeModule.registerHooks) {
    nodeModule.registerHooks(hooks)
} else {
    nodeModule.register('./test-hooks.mjs', import.meta.url)
}
