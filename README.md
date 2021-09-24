[![](docs/readme.png)](https://tabby.sh)


<p align="center">
  <a href="https://github.com/Eugeny/tabby/releases/latest"><img alt="GitHub All Releases" src="https://img.shields.io/github/downloads/eugeny/tabby/total.svg?label=DOWNLOADS&logo=github&style=for-the-badge"></a> &nbsp; <a href="https://nightly.link/Eugeny/tabby/workflows/build/master"><img src="https://shields.io/badge/-Nightly%20Builds-orange?logo=hackthebox&logoColor=fff&style=for-the-badge"/></a> &nbsp; <a href="https://matrix.to/#/#tabby-general:matrix.org"><img alt="Matrix" src="https://img.shields.io/matrix/tabby-general:matrix.org?logo=matrix&style=for-the-badge&color=magenta"></a>
</p>

<p align="center">
  <a href="https://ko-fi.com/J3J8KWTF">
    <img src="https://cdn.ko-fi.com/cdn/kofi3.png?v=2" width="150">
  </a>
</p>

----

### Downloads:

* [Latest release](https://github.com/Eugeny/tabby/releases/latest)
* [Repositories](https://packagecloud.io/eugeny/tabby): [Debian/Ubuntu-based](https://packagecloud.io/eugeny/tabby/install#bash-deb), [RPM-based](https://packagecloud.io/eugeny/tabby/install#bash-rpm)
* [Latest nightly build](https://nightly.link/Eugeny/tabby/workflows/build/master)

<br/>
<p align="center">
This README is also available in: <a href="./README.ko-KR.md">Korean</a>
</p>

----

[**Tabby**](https://tabby.sh) (formerly **Terminus**) is a highly configurable terminal emulator, SSH and serial client for Windows, macOS and Linux

* Integrated SSH and Telnet client and connection manager
* Integrated serial terminal
* Theming and color schemes
* Fully configurable shortcuts and multi-chord shortcuts
* Split panes
* Remembers your tabs
* PowerShell (and PS Core), WSL, Git-Bash, Cygwin, MSYS2, Cmder and CMD support
* Direct file transfer from/to SSH sessions via Zmodem
* Full Unicode support including double-width characters
* Doesn't choke on fast-flowing outputs
* Proper shell experience on Windows including tab completion (via Clink)
* Integrated encrypted container for SSH secrets and configuration

# Contents <!-- omit in toc -->

- [What Tabby is and isn't](#what-tabby-is-and-isnt)
- [Terminal features](#terminal-features)
- [SSH Client](#ssh-client)
- [Serial Terminal](#serial-terminal)
- [Portable](#portable)
- [Plugins](#plugins)
- [Themes](#themes)
- [Contributing](#contributing)

<a name="about"></a>

# What Tabby is and isn't

* **Tabby is** an alternative to Windows' standard terminal (conhost), PowerShell ISE, PuTTY, macOS Terminal.app and iTerm

* **Tabby is not** a new shell or a MinGW or Cygwin replacement. Neither is it lightweight - if RAM usage is of importance, consider [Conemu](https://conemu.github.io) or [Alacritty](https://github.com/jwilm/alacritty)

<a name="terminal"></a>

# Terminal features

![](docs/readme-terminal.png)

* A V220 terminal + various extensions
* Multiple nested split panes
* Tabs on any side of the window
* Optional dockable window with a global spawn hotkey ("Quake console")
* Progress detection
* Notification on process completion
* Bracketed paste, multiline paste warnings
* Font ligatures
* Custom shell profiles
* Optional RMB paste and copy-on select (PuTTY style)

<a name="ssh"></a>
# SSH Client

![](docs/readme-ssh.png)

* SSH2 client with a connection manager
* X11 and port forwarding
* Automatic jump host management
* Agent forwarding (incl. Pageant and Windows native OpenSSH Agent)
* Login scripts

<a name="serial"></a>
# Serial Terminal

* Saved connections
* Readline input support
* Optional hex byte-by-byte input and hexdump output
* Newline conversion
* Automatic reconnection

<a name="portable"></a>
# Portable

Tabby will run as a portable app on Windows, if you create a `data` folder in the same location where `Tabby.exe` lives.

<a name="plugins"></a>
# Plugins

Plugins and themes can be installed directly from the Settings view inside Tabby.

* [clickable-links](https://github.com/Eugeny/tabby-clickable-links) - makes paths and URLs in the terminal clickable
* [docker](https://github.com/Eugeny/tabby-docker) - connect to Docker containers
* [title-control](https://github.com/kbjr/terminus-title-control) - allows modifying the title of the terminal tabs by providing a prefix, suffix, and/or strings to be removed
* [quick-cmds](https://github.com/Domain/terminus-quick-cmds) - quickly send commands to one or all terminal tabs
* [save-output](https://github.com/Eugeny/tabby-save-output) - record terminal output into a file
* [sync-config](https://github.com/starxg/terminus-sync-config) - sync the config to Gist or Gitee
* [clippy](https://github.com/Eugeny/tabby-clippy) - an example plugin which annoys you all the time

<a name="themes"></a>
# Themes

* [hype](https://github.com/Eugeny/tabby-theme-hype) - a Hyper inspired theme
* [relaxed](https://github.com/Relaxed-Theme/relaxed-terminal-themes#terminus) - the Relaxed theme for Tabby
* [gruvbox](https://github.com/porkloin/terminus-theme-gruvbox)
* [windows10](https://www.npmjs.com/package/terminus-theme-windows10)
* [altair](https://github.com/yxuko/terminus-altair)

# Sponsors <!-- omit in toc -->

[![](https://assets-production.packagecloud.io/assets/packagecloud-logo-light-scaled-26ce8e96060fddf74afbd4445e63ba35590d4aaa56edc98495bb390ef3cae0ae.png)](https://packagecloud.io)

[**packagecloud**](https://packagecloud.io) has provided free Debian/RPM repository hosting

<a name="contributing"></a>
# Contributing

Pull requests and plugins are welcome!

See [HACKING.md](https://github.com/Eugeny/tabby/blob/master/HACKING.md) and [API docs](https://docs.tabby.sh/) for information of how the project is laid out, and a very brief plugin development tutorial.

---
<a name="contributors"></a>

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="http://www.russellmyers.com"><img src="https://avatars2.githubusercontent.com/u/184085?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Russell Myers</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=mezner" title="Code">💻</a></td>
    <td align="center"><a href="http://www.morwire.com"><img src="https://avatars1.githubusercontent.com/u/3991658?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Austin Warren</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=ehwarren" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/Drachenkaetzchen"><img src="https://avatars1.githubusercontent.com/u/162974?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Felicia Hummel</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=Drachenkaetzchen" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/mikemaccana"><img src="https://avatars2.githubusercontent.com/u/172594?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Mike MacCana</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=mikemaccana" title="Tests">⚠️</a> <a href="#design-mikemaccana" title="Design">🎨</a></td>
    <td align="center"><a href="https://github.com/yxuko"><img src="https://avatars1.githubusercontent.com/u/1786317?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Yacine Kanzari</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=yxuko" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/BBJip"><img src="https://avatars2.githubusercontent.com/u/32908927?v=4?s=100" width="100px;" alt=""/><br /><sub><b>BBJip</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=BBJip" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/Futagirl"><img src="https://avatars2.githubusercontent.com/u/33533958?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Futagirl</b></sub></a><br /><a href="#design-Futagirl" title="Design">🎨</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://www.levrik.io"><img src="https://avatars3.githubusercontent.com/u/9491603?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Levin Rickert</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=levrik" title="Code">💻</a></td>
    <td align="center"><a href="https://kwonoj.github.io"><img src="https://avatars2.githubusercontent.com/u/1210596?v=4?s=100" width="100px;" alt=""/><br /><sub><b>OJ Kwon</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=kwonoj" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/Domain"><img src="https://avatars2.githubusercontent.com/u/903197?v=4?s=100" width="100px;" alt=""/><br /><sub><b>domain</b></sub></a><br /><a href="#plugin-Domain" title="Plugin/utility libraries">🔌</a> <a href="https://github.com/Eugeny/tabby/commits?author=Domain" title="Code">💻</a></td>
    <td align="center"><a href="http://www.jbrumond.me"><img src="https://avatars1.githubusercontent.com/u/195127?v=4?s=100" width="100px;" alt=""/><br /><sub><b>James Brumond</b></sub></a><br /><a href="#plugin-kbjr" title="Plugin/utility libraries">🔌</a></td>
    <td align="center"><a href="http://www.growingwiththeweb.com"><img src="https://avatars0.githubusercontent.com/u/2193314?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Daniel Imms</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=Tyriar" title="Code">💻</a> <a href="#plugin-Tyriar" title="Plugin/utility libraries">🔌</a> <a href="https://github.com/Eugeny/tabby/commits?author=Tyriar" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/baflo"><img src="https://avatars2.githubusercontent.com/u/834350?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Florian Bachmann</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=baflo" title="Code">💻</a></td>
    <td align="center"><a href="http://michael-kuehnel.de"><img src="https://avatars2.githubusercontent.com/u/441011?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Michael Kühnel</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=mischah" title="Code">💻</a> <a href="#design-mischah" title="Design">🎨</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/NieLeben"><img src="https://avatars3.githubusercontent.com/u/47182955?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Tilmann Meyer</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=NieLeben" title="Code">💻</a></td>
    <td align="center"><a href="http://www.jubeat.net"><img src="https://avatars3.githubusercontent.com/u/11289158?v=4?s=100" width="100px;" alt=""/><br /><sub><b>PM Extra</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/issues?q=author%3APMExtra" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://jjuhas.keybase.pub//"><img src="https://avatars1.githubusercontent.com/u/6438760?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Jonathan</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=IgnusG" title="Code">💻</a></td>
    <td align="center"><a href="https://hans-koch.me"><img src="https://avatars0.githubusercontent.com/u/1093709?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Hans Koch</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=hammster" title="Code">💻</a></td>
    <td align="center"><a href="http://thepuzzlemaker.info"><img src="https://avatars3.githubusercontent.com/u/12666617?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Dak Smyth</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=ThePuzzlemaker" title="Code">💻</a></td>
    <td align="center"><a href="http://yfwz100.github.io"><img src="https://avatars2.githubusercontent.com/u/983211?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Wang Zhi</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=yfwz100" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/jack1142"><img src="https://avatars0.githubusercontent.com/u/6032823?v=4?s=100" width="100px;" alt=""/><br /><sub><b>jack1142</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=jack1142" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/hdougie"><img src="https://avatars1.githubusercontent.com/u/450799?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Howie Douglas</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=hdougie" title="Code">💻</a></td>
    <td align="center"><a href="https://chriskaczor.com"><img src="https://avatars2.githubusercontent.com/u/180906?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Chris Kaczor</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=ckaczor" title="Code">💻</a></td>
    <td align="center"><a href="https://www.boxmein.net"><img src="https://avatars1.githubusercontent.com/u/358714?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Johannes Kadak</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=boxmein" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/LeSeulArtichaut"><img src="https://avatars1.githubusercontent.com/u/38361244?v=4?s=100" width="100px;" alt=""/><br /><sub><b>LeSeulArtichaut</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=LeSeulArtichaut" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/CyrilTaylor"><img src="https://avatars0.githubusercontent.com/u/12631466?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Cyril Taylor</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=CyrilTaylor" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/nstefanou"><img src="https://avatars3.githubusercontent.com/u/51129173?v=4?s=100" width="100px;" alt=""/><br /><sub><b>nstefanou</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=nstefanou" title="Code">💻</a> <a href="#plugin-nstefanou" title="Plugin/utility libraries">🔌</a></td>
    <td align="center"><a href="https://github.com/orin220444"><img src="https://avatars3.githubusercontent.com/u/30747229?v=4?s=100" width="100px;" alt=""/><br /><sub><b>orin220444</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=orin220444" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/Goobles"><img src="https://avatars3.githubusercontent.com/u/8776771?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Gobius Dolhain</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=Goobles" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/3l0w"><img src="https://avatars2.githubusercontent.com/u/37798980?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Gwilherm Folliot</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=3l0w" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/Dimitory"><img src="https://avatars0.githubusercontent.com/u/475955?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Dmitry Pronin</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=dimitory" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/JonathanBeverley"><img src="https://avatars1.githubusercontent.com/u/20328966?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Jonathan Beverley</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=JonathanBeverley" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/zend"><img src="https://avatars1.githubusercontent.com/u/25160?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Zenghai Liang</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=zend" title="Code">💻</a></td>
    <td align="center"><a href="https://about.me/matishadow"><img src="https://avatars0.githubusercontent.com/u/9083085?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Mateusz Tracz</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=matishadow" title="Code">💻</a></td>
    <td align="center"><a href="https://zergpool.com"><img src="https://avatars3.githubusercontent.com/u/36234677?v=4?s=100" width="100px;" alt=""/><br /><sub><b>pinpin</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=pinpins" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/TakuroOnoda"><img src="https://avatars0.githubusercontent.com/u/1407926?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Takuro Onoda</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=TakuroOnoda" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/frauhottelmann"><img src="https://avatars2.githubusercontent.com/u/902705?v=4?s=100" width="100px;" alt=""/><br /><sub><b>frauhottelmann</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=frauhottelmann" title="Code">💻</a></td>
    <td align="center"><a href="http://patalong.pl"><img src="https://avatars.githubusercontent.com/u/29167842?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Piotr Patalong</b></sub></a><br /><a href="#design-VectorKappa" title="Design">🎨</a></td>
    <td align="center"><a href="https://github.com/clarkwang"><img src="https://avatars.githubusercontent.com/u/157076?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Clark Wang</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=clarkwang" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/iamchating"><img src="https://avatars.githubusercontent.com/u/7088153?v=4?s=100" width="100px;" alt=""/><br /><sub><b>iamchating</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=iamchating" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/starxg"><img src="https://avatars.githubusercontent.com/u/34997494?v=4?s=100" width="100px;" alt=""/><br /><sub><b>starxg</b></sub></a><br /><a href="#plugin-starxg" title="Plugin/utility libraries">🔌</a></td>
    <td align="center"><a href="http://hashnote.net/"><img src="https://avatars.githubusercontent.com/u/546312?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Alisue</b></sub></a><br /><a href="#design-lambdalisue" title="Design">🎨</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/ydcool"><img src="https://avatars.githubusercontent.com/u/5668295?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Dominic Yin</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=ydcool" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/bdr99"><img src="https://avatars.githubusercontent.com/u/2292715?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Brandon Rothweiler</b></sub></a><br /><a href="#design-bdr99" title="Design">🎨</a></td>
    <td align="center"><a href="https://git.io/JnP49"><img src="https://avatars.githubusercontent.com/u/63876444?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Logic Machine</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=logicmachine123" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/cypherbits"><img src="https://avatars.githubusercontent.com/u/10424900?v=4?s=100" width="100px;" alt=""/><br /><sub><b>cypherbits</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=cypherbits" title="Documentation">📖</a></td>
    <td align="center"><a href="https://modulolotus.net"><img src="https://avatars.githubusercontent.com/u/946421?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Matthew Davidson</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=KingMob" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/al-wi"><img src="https://avatars.githubusercontent.com/u/11092199?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Alexander Wiedemann</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=al-wi" title="Code">💻</a></td>
    <td align="center"><a href="https://www.notion.so/3d45c6bd2cbd4f938873a4bd12e23375"><img src="https://avatars.githubusercontent.com/u/59506394?v=4?s=100" width="100px;" alt=""/><br /><sub><b>장보연</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=BoYeonJang" title="Documentation">📖</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

<img src="https://ga-beacon.appspot.com/UA-3278102-18/github/readme" width="1"/>
