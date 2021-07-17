import { ConfigProvider } from 'tabby-core'

/** @hidden */
export class WebConfigProvider extends ConfigProvider {
    defaults = {
        web: {
            preventAccidentalTabClosure: true,
        },
    }
}
