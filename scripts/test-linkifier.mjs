import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const noOpDecorator = () => () => {}
class XTermFrontend {
    xterm = { options: {}, loadAddon () {} }
}
const dependencies = {
    '@angular/core': { Injectable: noOpDecorator, Inject: noOpDecorator },
    'tabby-core': { ConfigService: class {}, PlatformService: class {} },
    'tabby-terminal': { TerminalDecorator: class {}, XTermFrontend },
    'ngx-toastr': { ToastrService: class {} },
    '@xterm/addon-web-links': { WebLinksAddon: class {} },
    'untildify': value => value,
}
function load (file) {
    const source = readFileSync(new URL(`../tabby-linkifier/src/${file}.ts`, import.meta.url), 'utf8')
    const { outputText } = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2020,
            experimentalDecorators: true,
            esModuleInterop: true,
        },
    })
    const module = { exports: {} }
    const resolve = name => name in dependencies ? dependencies[name] : require(name)
    new Function('require', 'module', 'exports', outputText)(resolve, module, module.exports)
    return module.exports
}
dependencies['./api'] = load('api')
const { WindowsFileHandler } = load('handlers')
const { LinkHighlighterDecorator } = load('decorator')

const windows = new WindowsFileHandler({}, {})
for (const path of [
    'C:/Users/test/preview.png',
    'C:\\Users\\test\\preview.png',
    'D:/art/pose(1).png',
    '"C:/My Art/pose (1).png"',
    '"C:\\My Art\\pose (1).png"',
    '\\\\server\\share\\preview.png',
    '~\\preview.png',
]) {
    assert.equal(windows.regex.exec(path)?.[0], path, path)
    assert.equal(windows.fullMatchRegex.test(path), true, path)
}
assert.equal(windows.fullMatchRegex.test('https://example.com/image.png'), false)

const opened = []
const platform = { openExternal: uri => opened.push(uri) }
const config = { store: { clickableLinks: { modifier: 'ctrlKey' } } }
const decorator = new LinkHighlighterDecorator(config, platform, [windows])
const tab = { frontend: new XTermFrontend() }
decorator.attach(tab)
const handler = tab.frontend.xterm.options.linkHandler
assert.equal(handler.allowNonHttpProtocols, true)
const file = 'file:///C:/Users/test/preview.png'
handler.activate({ ctrlKey: false }, file)
assert.deepEqual(opened, [])
for (const uri of [file, 'https://example.com', 'http://example.com']) {
    handler.activate({ ctrlKey: true }, uri)
}
assert.deepEqual(opened, [file, 'https://example.com', 'http://example.com'])
for (const uri of ['javascript:alert(1)', 'data:text/html,hello', 'custom:action', 'not a URL']) {
    handler.activate({ ctrlKey: true }, uri)
}
assert.equal(opened.length, 3)
config.store.clickableLinks.modifier = null
handler.activate({}, file)
assert.equal(opened[opened.length - 1], file)
assert.equal(opened.length, 4)
console.log('Windows file paths and OSC 8 activation checks passed')
