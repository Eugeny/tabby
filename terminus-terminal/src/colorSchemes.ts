import * as fs from 'mz/fs'
import * as path from 'path'
import { Injectable } from '@angular/core'
import { TerminalColorSchemeProvider } from './api/colorSchemeProvider'
import { TerminalColorScheme } from './api/interfaces'

/** @hidden */
@Injectable()
export class HyperColorSchemes extends TerminalColorSchemeProvider {
    async getSchemes (): Promise<TerminalColorScheme[]> {
        const pluginsPath = path.join(process.env.HOME, '.hyper_plugins', 'node_modules')
        if (!await fs.exists(pluginsPath)) {
            return []
        }
        const plugins = await fs.readdir(pluginsPath)

        const themes: TerminalColorScheme[] = []

        plugins.forEach(plugin => {
            try {
                const module = (global as any).require(path.join(pluginsPath, plugin))
                if (module.decorateConfig) {
                    let config: any
                    try {
                        config = module.decorateConfig({})
                    } catch (error) {
                        console.warn('Could not load Hyper theme:', plugin)
                        return
                    }
                    if (config.colors) {
                        themes.push({
                            name: plugin,
                            foreground: config.foregroundColor,
                            background: config.backgroundColor,
                            cursor: config.cursorColor,
                            colors: config.colors.black ? [
                                config.colors.black,
                                config.colors.red,
                                config.colors.green,
                                config.colors.yellow,
                                config.colors.blue,
                                config.colors.magenta,
                                config.colors.cyan,
                                config.colors.white,
                                config.colors.lightBlack,
                                config.colors.lightRed,
                                config.colors.lightGreen,
                                config.colors.lightYellow,
                                config.colors.lightBlue,
                                config.colors.lightMagenta,
                                config.colors.lightCyan,
                                config.colors.lightWhite,
                            ] : config.colors,
                        })
                    }
                }
            } catch (err) {
                console.debug('Skipping Hyper plugin', plugin, err)
            }
        })

        return themes
    }
}
