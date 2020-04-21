![](https://github.com/Eugeny/terminus/raw/master/docs/readme.png)


<p align="center">
  <a href="https://raw.githubusercontent.com/Eugeny/terminus/master/LICENSE"><img alt="GitHub" src="https://img.shields.io/github/license/eugeny/terminus.svg?label=License&style=flat-square"></a> <a href="https://ci.appveyor.com/project/Eugeny/terminus"><img alt="AppVeyor" src="https://img.shields.io/appveyor/ci/eugeny/terminus.svg?label=CI&logo=appveyor&logoColor=white&style=flat-square"></a>
</p>

<p align="center">
  <a href="https://github.com/Eugeny/terminus/releases/latest"><img alt="GitHub All Releases" src="https://img.shields.io/github/downloads/eugeny/terminus/total.svg?label=DOWNLOAD&logo=github&style=for-the-badge"></a> <a href="https://ci.appveyor.com/project/Eugeny/terminus/build/artifacts"><img src="https://img.shields.io/badge/download-nightly%20build-magenta.svg?logo=appveyor&style=for-the-badge"/></a> <a href="https://gitter.im/terminus-terminal/community"><img alt="Gitter" src="https://img.shields.io/gitter/room/terminus/community.svg?color=blue&logo=gitter&style=for-the-badge"></a>
</p>

----

**Terminus** is a highly configurable terminal emulator for Windows, macOS and Linux

  * Integrated SSH client and connection manager
  * Theming and color schemes
  * Fully configurable shortcuts
  * Split panes
  * Remembers your tabs
  * PowerShell (and PS Core), WSL, Git-Bash, Cygwin, Cmder and CMD support
  * Direct file transfer from/to SSH sessions via Zmodem
  * Full Unicode support including double-width characters
  * Doesn't choke on fast-flowing outputs
  * Proper shell experience on Windows including tab completion (via Clink)


[![Buy me a coffee](https://github.com/Eugeny/terminus/raw/master/docs/kofi.png)](https://ko-fi.com/eugeny)

---

* **Terminus is** an alternative to Windows' standard terminal (conhost), PowerShell ISE, PuTTY or iTerm

* **Terminus is not** a new shell or a MinGW or Cygwin replacement. Neither is it lightweight - if RAM usage is of importance, consider [Conemu](https://conemu.github.io) or [Alacritty](https://github.com/jwilm/alacritty)

---

# Portable

For portable in windows, user can create folder `data` at the same directory as `Terminal.exe` to save the settings.

# Plugins

Plugins and themes can be installed directly from the Settings view inside Terminus.

  * [clickable-links](https://github.com/Eugeny/terminus-clickable-links) - makes paths and URLs in the terminal clickable
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
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="http://www.russellmyers.com"><img src="https://avatars2.githubusercontent.com/u/184085?v=4" width="100px;" alt=""/><br /><sub><b>Russell Myers</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=mezner" title="Code">💻</a></td>
    <td align="center"><a href="http://www.morwire.com"><img src="https://avatars1.githubusercontent.com/u/3991658?v=4" width="100px;" alt=""/><br /><sub><b>Austin Warren</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=ehwarren" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/Drachenkaetzchen"><img src="https://avatars1.githubusercontent.com/u/162974?v=4" width="100px;" alt=""/><br /><sub><b>Felicia Hummel</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=Drachenkaetzchen" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/mikemaccana"><img src="https://avatars2.githubusercontent.com/u/172594?v=4" width="100px;" alt=""/><br /><sub><b>Mike MacCana</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=mikemaccana" title="Tests">⚠️</a> <a href="#design-mikemaccana" title="Design">🎨</a></td>
    <td align="center"><a href="https://github.com/yxuko"><img src="https://avatars1.githubusercontent.com/u/1786317?v=4" width="100px;" alt=""/><br /><sub><b>Yacine Kanzari</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=yxuko" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/BBJip"><img src="https://avatars2.githubusercontent.com/u/32908927?v=4" width="100px;" alt=""/><br /><sub><b>BBJip</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=BBJip" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/Futagirl"><img src="https://avatars2.githubusercontent.com/u/33533958?v=4" width="100px;" alt=""/><br /><sub><b>Futagirl</b></sub></a><br /><a href="#design-Futagirl" title="Design">🎨</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://www.levrik.io"><img src="https://avatars3.githubusercontent.com/u/9491603?v=4" width="100px;" alt=""/><br /><sub><b>Levin Rickert</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=levrik" title="Code">💻</a></td>
    <td align="center"><a href="https://kwonoj.github.io"><img src="https://avatars2.githubusercontent.com/u/1210596?v=4" width="100px;" alt=""/><br /><sub><b>OJ Kwon</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=kwonoj" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/Domain"><img src="https://avatars2.githubusercontent.com/u/903197?v=4" width="100px;" alt=""/><br /><sub><b>domain</b></sub></a><br /><a href="#plugin-Domain" title="Plugin/utility libraries">🔌</a> <a href="https://github.com/Eugeny/terminus/commits?author=Domain" title="Code">💻</a></td>
    <td align="center"><a href="http://www.jbrumond.me"><img src="https://avatars1.githubusercontent.com/u/195127?v=4" width="100px;" alt=""/><br /><sub><b>James Brumond</b></sub></a><br /><a href="#plugin-kbjr" title="Plugin/utility libraries">🔌</a></td>
    <td align="center"><a href="http://www.growingwiththeweb.com"><img src="https://avatars0.githubusercontent.com/u/2193314?v=4" width="100px;" alt=""/><br /><sub><b>Daniel Imms</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=Tyriar" title="Code">💻</a> <a href="#plugin-Tyriar" title="Plugin/utility libraries">🔌</a> <a href="https://github.com/Eugeny/terminus/commits?author=Tyriar" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/baflo"><img src="https://avatars2.githubusercontent.com/u/834350?v=4" width="100px;" alt=""/><br /><sub><b>Florian Bachmann</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=baflo" title="Code">💻</a></td>
    <td align="center"><a href="http://michael-kuehnel.de"><img src="https://avatars2.githubusercontent.com/u/441011?v=4" width="100px;" alt=""/><br /><sub><b>Michael Kühnel</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=mischah" title="Code">💻</a> <a href="#design-mischah" title="Design">🎨</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/NieLeben"><img src="https://avatars3.githubusercontent.com/u/47182955?v=4" width="100px;" alt=""/><br /><sub><b>Tilmann Meyer</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=NieLeben" title="Code">💻</a></td>
    <td align="center"><a href="http://www.jubeat.net"><img src="https://avatars3.githubusercontent.com/u/11289158?v=4" width="100px;" alt=""/><br /><sub><b>PM Extra</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/issues?q=author%3APMExtra" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://jjuhas.keybase.pub//"><img src="https://avatars1.githubusercontent.com/u/6438760?v=4" width="100px;" alt=""/><br /><sub><b>Jonathan</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=IgnusG" title="Code">💻</a></td>
    <td align="center"><a href="https://hans-koch.me"><img src="https://avatars0.githubusercontent.com/u/1093709?v=4" width="100px;" alt=""/><br /><sub><b>Hans Koch</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=hammster" title="Code">💻</a></td>
    <td align="center"><a href="http://thepuzzlemaker.info"><img src="https://avatars3.githubusercontent.com/u/12666617?v=4" width="100px;" alt=""/><br /><sub><b>Dak Smyth</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=ThePuzzlemaker" title="Code">💻</a></td>
    <td align="center"><a href="http://yfwz100.github.io"><img src="https://avatars2.githubusercontent.com/u/983211?v=4" width="100px;" alt=""/><br /><sub><b>Wang Zhi</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=yfwz100" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/jack1142"><img src="https://avatars0.githubusercontent.com/u/6032823?v=4" width="100px;" alt=""/><br /><sub><b>jack1142</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=jack1142" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/hdougie"><img src="https://avatars1.githubusercontent.com/u/450799?v=4" width="100px;" alt=""/><br /><sub><b>Howie Douglas</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=hdougie" title="Code">💻</a></td>
    <td align="center"><a href="https://chriskaczor.com"><img src="https://avatars2.githubusercontent.com/u/180906?v=4" width="100px;" alt=""/><br /><sub><b>Chris Kaczor</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=ckaczor" title="Code">💻</a></td>
    <td align="center"><a href="https://www.boxmein.net"><img src="https://avatars1.githubusercontent.com/u/358714?v=4" width="100px;" alt=""/><br /><sub><b>Johannes Kadak</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=boxmein" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/LeSeulArtichaut"><img src="https://avatars1.githubusercontent.com/u/38361244?v=4" width="100px;" alt=""/><br /><sub><b>LeSeulArtichaut</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=LeSeulArtichaut" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/CyrilTaylor"><img src="https://avatars0.githubusercontent.com/u/12631466?v=4" width="100px;" alt=""/><br /><sub><b>Cyril Taylor</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=CyrilTaylor" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/nstefanou"><img src="https://avatars3.githubusercontent.com/u/51129173?v=4" width="100px;" alt=""/><br /><sub><b>nstefanou</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=nstefanou" title="Code">💻</a> <a href="#plugin-nstefanou" title="Plugin/utility libraries">🔌</a></td>
    <td align="center"><a href="https://github.com/orin220444"><img src="https://avatars3.githubusercontent.com/u/30747229?v=4" width="100px;" alt=""/><br /><sub><b>orin220444</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=orin220444" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/Goobles"><img src="https://avatars3.githubusercontent.com/u/8776771?v=4" width="100px;" alt=""/><br /><sub><b>Gobius Dolhain</b></sub></a><br /><a href="https://github.com/Eugeny/terminus/commits?author=Goobles" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
