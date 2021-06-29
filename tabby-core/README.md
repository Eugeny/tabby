Tabby Core Plugin
--------------------

See also: [Settings plugin API](./settings/), [Terminal plugin API](./terminal/), [Local terminal API](./local/)

* tabbed interface services
* toolbar UI
* config file management
* hotkeys
* tab recovery
* logging
* theming

Using the API:

```ts
import { AppService, TabContextMenuItemProvider } from 'tabby-core'
```

Exporting your subclasses:

```ts
@NgModule({
  ...
  providers: [
    ...
    { provide: TabContextMenuItemProvider, useClass: MyContextMenu, multi: true },
    ...
  ]
})
```
