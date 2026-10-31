import * as yaml from 'js-yaml'

/** Use one parser for config files and sync payloads. */
export function parseConfig (data: string): unknown {
    return yaml.load(data)
}

/** Preserve string scalars when older YAML readers interpret them as numbers. */
export function serializeConfig (config: unknown): string {
    return yaml.dump(config, { forceQuotes: true })
}
