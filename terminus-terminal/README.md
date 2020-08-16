Terminus Terminal Plugin
------------------------

* terminal tabs
* terminal frontends
* session management
* shell detection

Using the API:

```ts
import { ShellProvider } from 'terminus-terminal'
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
