Terminus Settings Plugin
------------------------

* tabbed settings interface

Using the API:

```ts
import { SettingsTabProvider } from 'terminus-settings'
```

Exporting your subclasses:

```ts
@NgModule({
  ...
  providers: [
    ...
    { provide: SettingsTabProvider, useClass: MySettingsTab, multi: true },
    ...
  ]
})
```
