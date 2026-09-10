/**
 * Strip ET session credentials from any user-visible or logged text.
 *
 * Handles both the `IDPASSKEY:<id>/<passkey>` marker the remote prints and the bare
 * `<id>/<passkey>` pair that appears in the bootstrap command line (16 alphanumerics /
 * 32 alphanumerics). Both forms carry the session passkey and must never reach a log.
 *
 * Deliberately dependency-free so it is trivially testable and importable from
 * anywhere, including the fuzz harness.
 */
export function redactCredentials (text: string): string {
    return text
        .replace(/IDPASSKEY:\S+/g, 'IDPASSKEY:[redacted]')
        .replace(/[A-Za-z0-9]{16}\/[A-Za-z0-9]{32}/g, '[redacted]/[redacted]')
}
