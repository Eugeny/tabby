import { ConfigProvider } from 'tabby-core'

/** @hidden */
export class ClickableLinksConfigProvider extends ConfigProvider {
    defaults = {
        clickableLinks: {
            modifier: null,
        },
    }

    platformDefaults = { }
}
