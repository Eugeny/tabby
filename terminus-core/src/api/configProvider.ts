/**
 * Extend to add your own config options
 */
export abstract class ConfigProvider {
    /**
     * Default values, e.g.
     *
     * ```ts
     * defaults = {
     *   myPlugin: {
     *     foo: 1
     *   }
     * }
     * ```
     */
    defaults: any = {}

    /**
     * [[Platform]] specific defaults, e.g.
     *
     * ```ts
     * platformDefaults = {
     *   [Platform.Windows]: {
     *     myPlugin: {
     *       bar: true
     *     }
     *   },
     *   [Platform.macOS]: {
     *     myPlugin: {
     *       bar: false
     *     }
     *   },
     * }
     * ```
     */
    platformDefaults: Record<string, any> = {}
}
