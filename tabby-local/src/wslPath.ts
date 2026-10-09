import { strictEqual } from 'assert'

/** Rewrite a POSIX guest cwd (e.g. WSL) to a Windows path via fsBase; unchanged otherwise. */
export function resolveGuestCWD (cwd: string | null | undefined, fsBase: string | null | undefined): string | null | undefined {
    if (cwd?.startsWith('/') && fsBase) {
        return fsBase + cwd.replace(/\//g, '\\')
    }
    return cwd
}

function selfCheck (): void {
    strictEqual(resolveGuestCWD('/home/x', '\\\\wsl$\\Ubuntu'), '\\\\wsl$\\Ubuntu\\home\\x')
    strictEqual(resolveGuestCWD('C:\\Users\\x', '\\\\wsl$\\Ubuntu'), 'C:\\Users\\x')
    strictEqual(resolveGuestCWD('/home/x', null), '/home/x')
    strictEqual(resolveGuestCWD(null, '\\\\wsl$\\Ubuntu'), null)
    strictEqual(resolveGuestCWD(undefined, null), undefined)
}

// run: npx ts-node -O '{"module":"commonjs"}' tabby-local/src/wslPath.ts
if (String(process.argv[1]).includes('wslPath')) {
    selfCheck()
}
