import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'
import { firstBy } from 'thenby'
import slugify from 'slugify'

function loadMethod (file, className, name, bindings = {}) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8')
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
    const cls = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === className)
    const method = cls.members.find(n => n.name?.getText(ast) === name)
    const code = ts.transpileModule(`class Probe { ${method.getText(ast)} }; return Probe`, {
        compilerOptions: { target: ts.ScriptTarget.ES2020 },
    }).outputText
    return new Function(...Object.keys(bindings), code)(...Object.values(bindings))
}

const Command = {}
Command.fromMenuItem = loadMethod('../src/api/commands.ts', 'Command', 'fromMenuItem', {
    slugify, Command, CommandLocation: { TabBodyMenu: 'body', TabHeaderMenu: 'header' },
}).fromMenuItem
const Service = loadMethod('../src/services/commands.service.ts', 'CommandService', 'buildContextMenu', { firstBy })

test('legacy menu items keep checkbox-ness and disabled state through commands', async () => {
    const commands = [
        { label: 'Plain', click: () => {} },
        { label: 'Unticked', type: 'checkbox', click: () => {} },
        { label: 'Ticked', type: 'radio', checked: true, click: () => {} },
        { label: 'Greyed', enabled: false, click: () => {} },
    ].flatMap(Command.fromMenuItem)
    assert.equal(commands[3].run, undefined)

    const service = Object.assign(new Service(), { getCommandsWithContexts: async () => commands })
    const menu = await service.buildContextMenu([{}], 'body')
    assert.deepEqual(menu.map(x => [x.label, x.type, x.checked, x.enabled]), [
        ['Plain', undefined, undefined, true],
        ['Unticked', 'checkbox', false, true],
        ['Ticked', 'checkbox', true, true],
        ['Greyed', undefined, undefined, false],
    ])
})
