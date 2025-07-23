import { Injectable } from '@angular/core'
import * as crypto from 'crypto'

@Injectable({ providedIn: 'root' })
export class TOTPService {
    /**
     * 生成TOTP代码
     * @param secret Base32编码的密钥
     * @param window 时间窗口（默认30秒）
     * @param digits 代码位数（默认6位）
     */
    generateTOTP (secret: string, window = 30, digits = 6): string {
        if (!secret) {
            throw new Error('TOTP secret is required')
        }

        try {
            // 解码Base32密钥
            const key = this.base32Decode(secret.toUpperCase().replace(/\s/g, ''))

            // 计算时间步长
            const epoch = Math.floor(Date.now() / 1000)
            const timeStep = Math.floor(epoch / window)

            // 生成HMAC
            const hmac = crypto.createHmac('sha1', key as any)
            const timeBuffer = Buffer.alloc(8)
            timeBuffer.writeUInt32BE(0, 0)
            timeBuffer.writeUInt32BE(timeStep, 4)
            hmac.update(timeBuffer as any)
            const hash = hmac.digest()

            // 动态截取
            const offset = hash[hash.length - 1] & 0x0f
            const binary = (hash[offset] & 0x7f) << 24 |
                          (hash[offset + 1] & 0xff) << 16 |
                          (hash[offset + 2] & 0xff) << 8 |
                          hash[offset + 3] & 0xff

            // 生成代码
            const otp = binary % Math.pow(10, digits)
            return otp.toString().padStart(digits, '0')
        } catch (error) {
            throw new Error(`Failed to generate TOTP: ${error.message}`)
        }
    }

    /**
     * 验证TOTP密钥格式
     */
    validateSecret (secret: string): boolean {
        if (!secret) { return false }

        try {
            // 移除空格并转为大写
            const cleanSecret = secret.toUpperCase().replace(/\s/g, '')

            // 检查Base32字符
            const base32Regex = /^[A-Z2-7]+=*$/
            if (!base32Regex.test(cleanSecret)) {
                return false
            }

            // 尝试解码
            this.base32Decode(cleanSecret)
            return true
        } catch {
            return false
        }
    }

    /**
     * 获取剩余时间（秒）
     */
    getRemainingTime (window = 30): number {
        const epoch = Math.floor(Date.now() / 1000)
        return window - epoch % window
    }

    /**
     * Base32解码
     */
    private base32Decode (encoded: string): Uint8Array {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
        let bits = 0
        let value = 0
        const output: number[] = []

        for (const char of encoded) {
            if (char === '=') { break }

            const index = alphabet.indexOf(char)
            if (index === -1) {
                throw new Error(`Invalid character in Base32: ${char}`)
            }

            value = value << 5 | index
            bits += 5

            if (bits >= 8) {
                output.push(value >>> bits - 8)
                bits -= 8
            }
        }

        return new Uint8Array(output)
    }
}
