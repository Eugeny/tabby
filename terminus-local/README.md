Terminus Local Plugin
---------------------

* local shells

Using the API:

```ts
import { ShellProvider } from 'terminus-local'
```

Exporting your subclasses:

```ts
@NgModule({
  ...
  providers: [
    ...
    { provide: ShellProvider, useClass: MyShellPlugin, multi: true },
    ...
  ]
})
```
