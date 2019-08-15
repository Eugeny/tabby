![](https://github.com/Eugeny/terminus/raw/master/docs/readme.png)


<p align="center">
  <a href="https://raw.githubusercontent.com/Eugeny/terminus/master/LICENSE"><img alt="GitHub" src="https://img.shields.io/github/license/eugeny/terminus.svg?label=License&style=flat-square"></a> <a href="https://travis-ci.org/Eugeny/terminus"><img alt="Travis (.org)" src="https://img.shields.io/travis/Eugeny/terminus.svg?label=CI&logo=travis&logoColor=white&style=flat-square"></a>
  <a href="https://ci.appveyor.com/project/Eugeny/terminus"><img alt="AppVeyor" src="https://img.shields.io/appveyor/ci/eugeny/terminus.svg?label=CI&logo=appveyor&logoColor=white&style=flat-square"></a> <a href="https://dev.azure.com/epankov/Terminus/_build?definitionId=1"><img alt="Azure Pipelines" src="https://img.shields.io/azure-devops/build/epankov/Terminus/1.svg?label=CI&style=flat-square" /></a>
</p>

<p align="center">
  <a href="https://github.com/Eugeny/terminus/releases/latest"><img alt="GitHub All Releases" src="https://img.shields.io/github/downloads/eugeny/terminus/total.svg?label=DOWNLOAD&logo=github&style=for-the-badge"></a> <a href="https://ci.appveyor.com/project/Eugeny/terminus/build/artifacts"><img src="https://img.shields.io/badge/download-nightly%20build-magenta.svg?logo=appveyor&style=for-the-badge"/></a> <a href="https://gitter.im/terminus-terminal/community"><img alt="Gitter" src="https://img.shields.io/gitter/room/terminus/community.svg?color=blue&logo=gitter&style=for-the-badge"></a>
</p>

----

**Terminus** is a highly configurable terminal emulator for Windows, macOS and Linux

  * Theming and color schemes
  * Fully configurable shortcuts
  * Split panes
  * Remembers your tabs
  * PowerShell (and PS Core), WSL, Git-Bash, Cygwin, Cmder and CMD support
  * Integrated SSH client and connection manager
  * Full Unicode support including double-width characters
  * Doesn't choke on fast-flowing outputs
  * Proper shell experience on Windows including tab completion (via Clink)


[![Buy me a coffee](https://github.com/Eugeny/terminus/raw/master/docs/kofi.png)](https://ko-fi.com/eugeny)

---

* **Terminus is** an alternative to Windows' standard terminal (conhost), PowerShell ISE, PuTTY or iTerm

* **Terminus is not** a new shell or a MinGW or Cygwin replacement. Neither is it lightweight - if RAM usage is of importance, consider [Conemu](https://conemu.github.io) or [Alacritty](https://github.com/jwilm/alacritty)

---

# Plugins

Plugins and themes can be installed directly from the Settings view inside Terminus.

  * [clickable-links](https://github.com/Eugeny/terminus-clickable-links) - makes paths and URLs in the terminal clickable
  * [shell-selector](https://github.com/Eugeny/terminus-shell-selector) - a quick shell selector pane
  * [title-control](https://github.com/kbjr/terminus-title-control) - allows modifying the title of the terminal tabs by providing a prefix, suffix, and/or strings to be removed
  * [quick-cmds](https://github.com/Domain/terminus-quick-cmds) - quickly send commands to one or all terminal tabs
  * [save-output](https://github.com/Eugeny/terminus-save-output) - record terminal output into a file
  * [scrollbar](https://github.com/kbjr/terminus-scrollbar) - adds a scrollbar to hterm tabs

# Themes

  * [hype](https://github.com/Eugeny/terminus-theme-hype) - a Hyper inspired theme
  * [relaxed](https://github.com/Relaxed-Theme/relaxed-terminal-themes#terminus) - the Relaxed theme for Terminus
  * [gruvbox](https://github.com/porkloin/terminus-theme-gruvbox)
  * [windows10](https://www.npmjs.com/package/terminus-theme-windows10)
  * [altair](https://github.com/yxuko/terminus-altair)

---

# Contributing

Pull requests and plugins are welcome!

See [HACKING.md](https://github.com/Eugeny/terminus/blob/master/HACKING.md) and [API docs](http://ajenti.org/terminus-docs/) for information of how the project is laid out, and a very brief plugin development tutorial.

---

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore -->
<table>
  <tr>
    <td align="center"><a href="http://www.russellmyers.com"><img src="https://avatars2.githubusercontent.com/u/184085?v=4" width="100px;" alt="Russell Myers"/><br /><sub><b>Russell Myers</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=mezner" title="Code">💻</a></td>
    <td align="center"><a href="http://www.morwire.com"><img src="https://avatars1.githubusercontent.com/u/3991658?v=4" width="100px;" alt="Austin Warren"/><br /><sub><b>Austin Warren</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=ehwarren" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/Drachenkaetzchen"><img src="https://avatars1.githubusercontent.com/u/162974?v=4" width="100px;" alt="Felicia Hummel"/><br /><sub><b>Felicia Hummel</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=Drachenkaetzchen" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/mikemaccana"><img src="https://avatars2.githubusercontent.com/u/172594?v=4" width="100px;" alt="Mike MacCana"/><br /><sub><b>Mike MacCana</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=mikemaccana" title="Tests">⚠️</a> <a href="#design-mikemaccana" title="Design">🎨</a></td>
    <td align="center"><a href="https://github.com/yxuko"><img src="https://avatars1.githubusercontent.com/u/1786317?v=4" width="100px;" alt="Yacine Kanzari"/><br /><sub><b>Yacine Kanzari</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=yxuko" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/BBJip"><img src="https://avatars2.githubusercontent.com/u/32908927?v=4" width="100px;" alt="BBJip"/><br /><sub><b>BBJip</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=BBJip" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/Futagirl"><img src="https://avatars2.githubusercontent.com/u/33533958?v=4" width="100px;" alt="Futagirl"/><br /><sub><b>Futagirl</b></sub></a><br /><a href="#design-Futagirl" title="Design">🎨</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://www.levrik.io"><img src="https://avatars3.githubusercontent.com/u/9491603?v=4" width="100px;" alt="Levin Rickert"/><br /><sub><b>Levin Rickert</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=levrik" title="Code">💻</a></td>
    <td align="center"><a href="https://kwonoj.github.io"><img src="https://avatars2.githubusercontent.com/u/1210596?v=4" width="100px;" alt="OJ Kwon"/><br /><sub><b>OJ Kwon</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=kwonoj" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/Domain"><img src="https://avatars2.githubusercontent.com/u/903197?v=4" width="100px;" alt="domain"/><br /><sub><b>domain</b></sub></a><br /><a href="#plugin-Domain" title="Plugin/utility libraries">🔌</a> <a href="https://github.com/Eugeny/terminus/commits?author=Domain" title="Code">💻</a></td>
    <td align="center"><a href="http://www.jbrumond.me"><img src="https://avatars1.githubusercontent.com/u/195127?v=4" width="100px;" alt="James Brumond"/><br /><sub><b>James Brumond</b></sub></a><br /><a href="#plugin-kbjr" title="Plugin/utility libraries">🔌</a></td>
    <td align="center"><a href="http://www.growingwiththeweb.com"><img src="https://avatars0.githubusercontent.com/u/2193314?v=4" width="100px;" alt="Daniel Imms"/><br /><sub><b>Daniel Imms</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=Tyriar" title="Code">💻</a> <a href="#plugin-Tyriar" title="Plugin/utility libraries">🔌</a> <a href="https://github.com/Eugeny/terminus/commits?author=Tyriar" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/baflo"><img src="https://avatars2.githubusercontent.com/u/834350?v=4" width="100px;" alt="Florian Bachmann"/><br /><sub><b>Florian Bachmann</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=baflo" title="Code">💻</a></td>
    <td align="center"><a href="http://michael-kuehnel.de"><img src="https://avatars2.githubusercontent.com/u/441011?v=4" width="100px;" alt="Michael Kühnel"/><br /><sub><b>Michael Kühnel</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=mischah" title="Code">💻</a> <a href="#design-mischah" title="Design">🎨</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/NieLeben"><img src="https://avatars3.githubusercontent.com/u/47182955?v=4" width="100px;" alt="Tilmann Meyer"/><br /><sub><b>Tilmann Meyer</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=NieLeben" title="Code">💻</a></td>
    <td align="center"><a href="http://www.jubeat.net"><img src="https://avatars3.githubusercontent.com/u/11289158?v=4" width="100px;" alt="PM Extra"/><br /><sub><b>PM Extra</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/issues?q=author%3APMExtra" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://jjuhas.keybase.pub//"><img src="https://avatars1.githubusercontent.com/u/6438760?v=4" width="100px;" alt="Jonathan"/><br /><sub><b>Jonathan</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=IgnusG" title="Code">💻</a></td>
    <td align="center"><a href="https://hans-koch.me"><img src="https://avatars0.githubusercontent.com/u/1093709?v=4" width="100px;" alt="Hans Koch"/><br /><sub><b>Hans Koch</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=hammster" title="Code">💻</a></td>
    <td align="center"><a href="http://thepuzzlemaker.info"><img src="https://avatars3.githubusercontent.com/u/12666617?v=4" width="100px;" alt="Dak Smyth"/><br /><sub><b>Dak Smyth</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=ThePuzzlemaker" title="Code">💻</a></td>
  </tr>
</table>

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
