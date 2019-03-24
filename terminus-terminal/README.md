Terminus Terminal Plugin
------------------------

* terminal tabs
* terminal frontends
* session management
* shell detection

Using the API:

```ts
import { TerminalContextMenuItemProvider } from 'terminus-terminal'
```

Exporting your subclasses:

```ts
@NgModule({
  ...
  providers: [
    ...
    { provide: TerminalContextMenuItemProvider, useClass: MyContextMenu, multi: true },
    ...
  ]
})
```
