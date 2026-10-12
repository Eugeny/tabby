// Module hooks for unit tests of plugin internals (see test-register.mjs):
// - compile .ts with the project's own TypeScript, so parameter properties etc. work on every
//   Node version (Node's built-in type stripping does not support them);
// - resolve extension-less relative imports the way webpack does;
// - stand in for the few `tabby-core` runtime exports plugin internals use - the real package
//   is the whole Angular app and cannot load outside Electron.
import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const TABBY_CORE_STUB = `
export class SubscriptionContainer {
    constructor () { this.subscriptions = [] }
    addSubscription (s) { this.subscriptions.push(s) }
    subscribe (observable, handler) { this.subscriptions.push(observable.subscribe(handler)) }
    cancelAll () { for (const s of this.subscriptions) s.unsubscribe(); this.subscriptions = [] }
}
`

function isFile (url) {
    try {
        return statSync(fileURLToPath(url)).isFile()
    } catch {
        return false
    }
}

export function resolve (specifier, context, nextResolve) {
    if (specifier === 'tabby-core') {
        return { url: 'tabby-test-stub:tabby-core', shortCircuit: true }
    }
    if (/^\.\.?\//.test(specifier) && !/\.[cm]?[jt]s$/.test(specifier) && context.parentURL?.endsWith('.ts')) {
        for (const candidate of [`${specifier}.ts`, `${specifier}/index.ts`]) {
            const url = new URL(candidate, context.parentURL).href
            if (isFile(url)) {
                return { url, shortCircuit: true }
            }
        }
    }
    return nextResolve(specifier, context)
}

export function load (url, context, nextLoad) {
    if (url === 'tabby-test-stub:tabby-core') {
        return { format: 'module', source: TABBY_CORE_STUB, shortCircuit: true }
    }
    if (url.startsWith('file:') && url.endsWith('.ts') && !url.includes('/node_modules/')) {
        const fileName = fileURLToPath(url)
        const { outputText } = ts.transpileModule(readFileSync(fileName, 'utf8'), {
            fileName,
            compilerOptions: {
                module: ts.ModuleKind.ESNext,
                target: ts.ScriptTarget.ES2020,
                esModuleInterop: true,
                experimentalDecorators: true,
            },
        })
        return { format: 'module', source: outputText, shortCircuit: true }
    }
    return nextLoad(url, context)
}
