import * as yaml from 'js-yaml'

// js-yaml 4.1.0 (bundled by the app and used by every Tabby build so far) resolves any scalar
// matching this pattern as a float, so an unquoted hex vault salt such as 5631e17759586923 reads
// back as Infinity. js-yaml 4.3 only resolves finite values as floats and therefore writes such
// strings unquoted. Dumping with a schema that still treats them as floats makes the dumper quote
// exactly those strings and nothing else, so every reader keeps them as strings.
const LEGACY_FLOAT_PATTERN = new RegExp(
    '^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?' +
    '|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?' +
    '|[-+]?\\.(?:inf|Inf|INF)' +
    '|\\.(?:nan|NaN|NAN))$',
)

// js-yaml exports its built-in types, but @types/js-yaml does not declare them
interface BuiltinType {
    resolve: (data: string) => boolean
    construct: (data: string) => unknown
    predicate?: ((data: object) => boolean) | null
    represent?: yaml.TypeConstructorOptions['represent'] | null
    defaultStyle?: string | null
}
const { float } = (yaml as unknown as { types: { float: BuiltinType } }).types
const isFloat = float.predicate
const legacySafeFloat = new yaml.Type('tag:yaml.org,2002:float', {
    kind: 'scalar',
    resolve: (data: string) => float.resolve(data) || LEGACY_FLOAT_PATTERN.test(data) && !data.endsWith('_'),
    construct: (data: string) => float.construct(data),
    predicate: isFloat ? data => isFloat(data) : undefined,
    represent: float.represent ?? undefined,
    defaultStyle: float.defaultStyle ?? undefined,
})

/** DEFAULT_SCHEMA with its float type replaced in place; dumping is otherwise unchanged */
const SERIALIZATION_SCHEMA = yaml.DEFAULT_SCHEMA.extend({ implicit: [legacySafeFloat] })

/** Use one parser for config files and sync payloads. */
export function parseConfig (data: string): unknown {
    return yaml.load(data)
}

/** Quote the string scalars that older YAML readers would interpret as numbers. */
export function serializeConfig (config: unknown): string {
    return yaml.dump(config, { schema: SERIALIZATION_SCHEMA })
}
