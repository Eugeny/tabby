interface RGB {
    r: number
    g: number
    b: number
}

interface LAB {
    l: number
    a: number
    b: number
}

function rgbToLab (rgb: RGB): LAB {
    let r = rgb.r / 255.0
    let g = rgb.g / 255.0
    let b = rgb.b / 255.0

    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92

    let x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047
    let y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750
    let z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883

    x = x > 0.008856 ? Math.cbrt(x) : 7.787 * x + 16.0 / 116.0
    y = y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16.0 / 116.0
    z = z > 0.008856 ? Math.cbrt(z) : 7.787 * z + 16.0 / 116.0

    return { l: 116.0 * y - 16.0, a: 500.0 * (x - y), b: 200.0 * (y - z) }
}

function labToRgb (lab: LAB): RGB {
    const y = (lab.l + 16.0) / 116.0
    const x = lab.a / 500.0 + y
    const z = y - lab.b / 200.0

    const x3 = x * x * x
    const y3 = y * y * y
    const z3 = z * z * z
    const xf = (x3 > 0.008856 ? x3 : (x - 16.0 / 116.0) / 7.787) * 0.95047
    const yf = y3 > 0.008856 ? y3 : (y - 16.0 / 116.0) / 7.787
    const zf = (z3 > 0.008856 ? z3 : (z - 16.0 / 116.0) / 7.787) * 1.08883

    let r = xf * 3.2404542 - yf * 1.5371385 - zf * 0.4985314
    let g = -xf * 0.9692660 + yf * 1.8760108 + zf * 0.0415560
    let b = xf * 0.0556434 - yf * 0.2040259 + zf * 1.0572252

    r = r > 0.0031308 ? 1.055 * Math.pow(r, 1.0 / 2.4) - 0.055 : 12.92 * r
    g = g > 0.0031308 ? 1.055 * Math.pow(g, 1.0 / 2.4) - 0.055 : 12.92 * g
    b = b > 0.0031308 ? 1.055 * Math.pow(b, 1.0 / 2.4) - 0.055 : 12.92 * b

    return {
        r: Math.round(Math.min(Math.max(r, 0.0), 1.0) * 255.0),
        g: Math.round(Math.min(Math.max(g, 0.0), 1.0) * 255.0),
        b: Math.round(Math.min(Math.max(b, 0.0), 1.0) * 255.0),
    }
}

function lerpLab (t: number, a: LAB, b: LAB): LAB {
    return {
        l: a.l + t * (b.l - a.l),
        a: a.a + t * (b.a - a.a),
        b: a.b + t * (b.b - a.b),
    }
}

function parseHexColor (hex: string): RGB {
    hex = hex.replace('#', '')
    return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16),
    }
}

function rgbToHex (rgb: RGB): string {
    const r = rgb.r.toString(16).padStart(2, '0')
    const g = rgb.g.toString(16).padStart(2, '0')
    const b = rgb.b.toString(16).padStart(2, '0')
    return `#${r}${g}${b}`
}

/**
 * Generate extended 256-color palette (indices 16-255) from base16 colors
 * using LAB color space interpolation. User-defined colors beyond index 15
 * in the scheme's colors array are preserved and not overwritten.
 *
 * @param colors - Array of hex color strings (at least 16; entries beyond 16 are user-defined extended colors)
 * @param bg - Background color as hex string
 * @param fg - Foreground color as hex string
 * @param harmonious - If true, disable light-theme inversion
 * @returns Array of 240 hex color strings for indices 16-255
 */
export function generatePalette (colors: string[], bg: string, fg: string, harmonious: boolean): string[] {
    const base8Lab: LAB[] = []
    for (let i = 0; i < 8; i++) {
        base8Lab.push(rgbToLab(parseHexColor(colors[i])))
    }
    const bgLab = rgbToLab(parseHexColor(bg))
    const fgLab = rgbToLab(parseHexColor(fg))

    const isLightTheme = fgLab.l < bgLab.l
    const invert = isLightTheme && !harmonious
    const corner0 = invert ? fgLab : bgLab
    const corner7 = invert ? bgLab : fgLab

    const palette: string[] = []

    // Color cube (indices 16-231): 6x6x6
    let idx = 16
    for (let ri = 0; ri < 6; ri++) {
        const tr = ri / 5.0
        const c0 = lerpLab(tr, corner0, base8Lab[1])
        const c1 = lerpLab(tr, base8Lab[2], base8Lab[3])
        const c2 = lerpLab(tr, base8Lab[4], base8Lab[5])
        const c3 = lerpLab(tr, base8Lab[6], corner7)
        for (let gi = 0; gi < 6; gi++) {
            const tg = gi / 5.0
            const c4 = lerpLab(tg, c0, c1)
            const c5 = lerpLab(tg, c2, c3)
            for (let bi = 0; bi < 6; bi++) {
                if (colors[idx]) {
                    palette.push(colors[idx])
                } else {
                    const c6 = lerpLab(bi / 5.0, c4, c5)
                    palette.push(rgbToHex(labToRgb(c6)))
                }
                idx++
            }
        }
    }

    // Grayscale ramp (indices 232-255): 24 shades
    for (let i = 0; i < 24; i++) {
        if (colors[idx]) {
            palette.push(colors[idx])
        } else {
            const t = (i + 1) / 25.0
            palette.push(rgbToHex(labToRgb(lerpLab(t, corner0, corner7))))
        }
        idx++
    }

    return palette
}
