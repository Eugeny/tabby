# Some background

Terminus is an Electron app, with the frontend written in Typescript with the help of Angular framework. It's built using Webpack.

# Getting started

First of all, clone this repository. You'll also need a recent version of Node installed.

First, install the dependencies:

```
# macOS/Linux:
npm install
./scripts/install-deps.js
./scripts/build-native.js

# Windows:
npm -g install windows-build-tools
npm install
node scripts\install-deps.js
node scripts\build-native.js
```

Now, check if your build is working:

```
npm run build
```

Start Terminus with

```
npm start
```

# Project layout
```
terminus
├─ app                                  # Electron app, just the bare essentials
|  ├─ src                               # Electron renderer code
|  └─ main.js                           # Electron main entry point
├─ build
├─ clink                                # Clink distributive, for Windows
├─ scripts                              # Maintenance scripts
├─ terminus-community-color-schemes     # Plugin that provides color schemes
├─ terminus-core                        # Plugin that provides base UI and tab management
├─ terminus-plugin-manager              # Plugin that installs other plugins
├─ terminus-settings                    # Plugin that provides the settings tab
└─ terminus-terminal                    # Plugin that provides terminal tabs
```

# Plugin layout
```
terminus-pluginname
├─ src                                  # Typescript code
|  ├─ components                        # Angular components
|  |  ├─ foo.component.ts               # Code
|  |  ├─ foo.component.scss             # Styles
|  |  └─ foo.component.pug              # Template
|  ├─ services                          # Angular services
|  |  └─ foo.service.ts
|  ├─ api.ts                            # Publicly exported API
|  └─ index.ts                          # Module entry point
├─ package.json
├─ tsconfig.json
└─ webpack.config.js                         
```

# Plugins

The app will load all plugins from the source checkout in the dev mode, from the user's plugins directory at all times (click `Open Plugins Directory` under `Settings` > `Plugins`) and from the directory specified by the `TERMINUS_PLUGINS` environment var.

Only modules whose `package.json` file contains a `terminus-plugin` keyword will be loaded.

If you're currently in your plugin's directory, start Terminus as `TERMINUS_PLUGINS=$(pwd) terminus --debug`

A plugin should only provide a default export, which should be a `NgModule` class (or a `NgModuleWithDependencies` where applicable). This module will be injected as a dependency to the app's root module.

```javascript
import { NgModule } from '@angular/core'

@NgModule()
export default class MyModule {
  constructor () {
    console.log('Angular engaged, cap\'n.')
  }
}
```

Plugins provide functionality by exporting singular or multi providers:


```javascript
import { NgModule, Injectable } from '@angular/core'
import { ToolbarButtonProvider, ToolbarButton } from 'terminus-core'

@Injectable()
export class MyButtonProvider extends ToolbarButtonProvider {
    provide (): ToolbarButton[] {
        return [{
            icon: 'star',
            title: 'Foobar',
            weight: 10,
            click: () => {
                alert('Woohoo!')
            }
        }]
    }
}

@NgModule({
    providers: [
        { provide: ToolbarButtonProvider, useClass: MyButtonProvider, multi: true },
    ],
})
export default class MyModule { }
```


See `terminus-core/src/api.ts`, `terminus-settings/src/api.ts` and `terminus-terminal/src/api.ts` for the available extension points.

Publish your plugin on NPM with a `terminus-plugin` keyword to make it appear in the Plugin Manager.
