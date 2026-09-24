let webGLCompatible: boolean | undefined = undefined

/** Returns undefined if the answer is inconclusive (e.g. the GPU process is restarting) */
function checkWebGLCompatibility (): boolean | undefined {
    let gl: WebGL2RenderingContext | null = null
    try {
        gl = document.createElement('canvas').getContext('webgl2')
        if (!gl) {
            // The GPU process may just be restarting - don't cache this as a hard no
            return undefined
        }
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
        if (!debugInfo) {
            return true
        }
        const renderer: unknown = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        return typeof renderer !== 'string' || !renderer.startsWith('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)')
    } catch {
        return undefined
    } finally {
        // Detaching a canvas leaves its context alive until garbage collection
        try {
            gl?.getExtension('WEBGL_lose_context')?.loseContext()
        } catch { }
    }
}

/** @hidden */
export function shouldUseWebGL (frontend: string, disableGPU = false): boolean {
    if (frontend !== 'xterm-webgl' || disableGPU) {
        return false
    }
    webGLCompatible ??= checkWebGLCompatibility()
    return webGLCompatible ?? false
}
