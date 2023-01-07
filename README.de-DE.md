[![](docs/readme.png)](https://tabby.sh)

<p  align="center">
<a  href="https://github.com/Eugeny/tabby/releases/latest"><img  alt="Alle GitHub Releases"  src="https://img.shields.io/github/downloads/eugeny/tabby/total.svg?label=DOWNLOADS&logo=github&style=for-the-badge"></a>     <a  href="https://nightly.link/Eugeny/tabby/workflows/build/master"><img  src="https://shields.io/badge/-Nightly%20Builds-orange?logo=hackthebox&logoColor=fff&style=for-the-badge"/></a>     <a  href="https://matrix.to/#/#tabby-general:matrix.org"><img  alt="Matrix"  src="https://img.shields.io/matrix/tabby-general:matrix.org?logo=matrix&style=for-the-badge&color=magenta"></a> &nbsp <a  href="https://translate.tabby.sh/"><img  alt="Übersetzen"  src="https://shields.io/badge/Übersetzen-UI-white?logo=googletranslate&style=for-the-badge&color=white&logoColor=fff"></a>     <a  href="https://twitter.com/eugeeeeny"><img  alt="Twitter"  src="https://shields.io/badge/Abonnieren-Nachrichten-blue?logo=twitter&style=for-the-badge&color=blue"></a>
</p>

<p align="center">
  <a href="https://ko-fi.com/J3J8KWTF">
    <img src="https://cdn.ko-fi.com/cdn/kofi3.png?v=2" width="150">
  </a>
</p>

----

### Downloads:

* [Neueste Version](https://github.com/Eugeny/tabby/releases/latest)
* [Repositories](https://packagecloud.io/eugeny/tabby): [Debian/Ubuntu-basiert](https://packagecloud.io/eugeny/tabby/install#bash-deb), [RPM-basiert](https://packagecloud.io/eugeny/tabby/install#bash-rpm)
* [Neueste nightly Version](https://nightly.link/Eugeny/tabby/workflows/build/master)

<br/>
<p  align="center">
Diese README ist auch verfügbar in: <a  href="./README.md">:gb: English</a> · <a  href="./README.es-ES.md">:es: Spanish</a> · <a  href="./README.ru-RU.md">:ru: Русский</a> · <a  href="./README.ko-KR.md">:kr: 한국어</a> · <a  href="./README.zh-CN.md">:cn: 简体中文</a> · <a  href="./README.it-IT.md">:it: Italiano</a> · <a href="./README.ja-JP.md">:jp: 日本語</a> · <a href="./README.id-ID.md">:id: Bahasa Indonesia</a> · <a href="./README.pt-BR.md">:br: Português</a>
</p>

----

[**Tabby**](https://tabby.sh) (ehemals **Terminus**) ist ein äußerst konfigurierbarer Terminalemulator, SSH- und serieller Client für Windows, macOS und Linux

* Integrierter SSH- und Telnet-Client und Verbindungsmanager
* Integriertes serielles Terminal
* Theming und Farbschemata
* Vollständig konfigurierbare Tastenkombinationen und Multi-Akkord-Tastenkombinationen
* Geteilte Fenster
* Merkt sich deine Tabs
* Unterstützung für PowerShell (und PS Core), WSL, Git-Bash, Cygwin, MSYS2, Cmder und CMD
* Direkte Dateiübertragung von/zu SSH-Sitzungen über Zmodem
* Vollständige Unicode-Unterstützung, einschließlich Zeichen mit doppelter Breite
* Kein Abbruch bei schnell ablaufenden Ausgaben
* Richtiges Shell-Erlebnis unter Windows, einschließlich Tabulator-Vervollständigung (über Clink)
* Integrierter verschlüsselter Container für SSH-Secrets und Konfiguration
* SSH-, SFTP- und Telnet-Client verfügbar als [Web-App](https://tabby.sh/app) (auch [selbstgehostet](https://github.com/Eugeny/tabby-web)).

# Inhaltsverzeichnis <!-- omit in toc -->

- [Was Tabby ist und was nicht](#what-tabby-is-and-isnt)
- [Terminal-Funktionen](#terminal-features)
- [SSH Client](#ssh-client)
- [Serielles Terminal](#serial-terminal)
- [Portabel](#portable)
- [Plugins](#plugins)
- [Themen](#themes)
- [Beitragen](#contributing)

<a  name="about"></a>

# Was Tabby ist und was nicht

**Tabby ist** eine Alternative zu Windows Standard-Terminal (conhost), PowerShell ISE, PuTTY, macOS Terminal.app und iTerm

**Tabby ist weder** eine neue Shell noch ein MinGW- oder Cygwin-Ersatz. Sie ist auch nicht gerade sparsam - wenn die RAM-Nutzung von Bedeutung ist, solltest Du [Conemu](https://conemu.github.io) oder [Alacritty](https://github.com/jwilm/alacritty) in Betracht ziehen.

<a  name="terminal"></a>

# Terminal-Funktionen

![](docs/readme-terminal.png)

* Ein V220-Terminal + verschiedene Erweiterungen
* Mehrere verschachtelte, geteilte Fenster
* Tabs auf jeder Seite des Fensters
* Optional andockbares Fenster mit einem globalen Spawn-Hotkey ("Quake-Konsole")
* Fortschrittserkennung
* Benachrichtigung bei Prozessabschluss
* Einfügen in Klammern, mehrzeilige Einfügewarnungen
* Schriftart-Ligaturen
* Benutzerdefinierte Shell-Profile
* Optionales RMB-Einfügen und Kopieren bei Auswahl (PuTTY-Stil)

<a  name="ssh"></a>

# SSH Client

![](docs/readme-ssh.png)

* SSH2-Client mit einem Verbindungsmanager
* X11 und Portweiterleitung
* Automatisches Jump-Host-Management
* Agent-Weiterleitung (inkl. Pageant und Windows-eigenem OpenSSH-Agent)
* Anmeldeskripte

<a  name="serial"></a>

# Serielles Terminal

* Gespeicherte Verbindungen
* Unterstützung von Readline-Eingaben
* Optionale hexadezimale Byte-für-Byte-Eingabe und Hexdump-Ausgabe
* Newline-Konvertierung
* Automatische Wiederverbindung

<a  name="portable"></a>

# Portabel

Tabby läuft als portable Anwendung unter Windows, wenn Sie einen `data`-Ordner am selben Ort erstellen, an dem sich auch `Tabby.exe` befindet.

<a  name="plugins"></a>

# Plugins

Plugins und Themen können direkt aus der Ansicht "Einstellungen" in Tabby installiert werden.

* [docker](https://github.com/Eugeny/tabby-docker) - Verbindung zu Docker-Containern
* [title-control](https://github.com/kbjr/terminus-title-control) - ermöglicht die Änderung des Titels der Terminal-Tabs durch Angabe eines Präfixes, Suffixes und/oder zu entfernender Strings
* [quick-cmds](https://github.com/Domain/terminus-quick-cmds) - schnelles Senden von Befehlen an eine oder alle Terminal-Tabs
* [save-output](https://github.com/Eugeny/tabby-save-output) - speichert Terminalausgaben in einer Datei
* [sync-config](https://github.com/starxg/terminus-sync-config) - synchronisiert die Konfiguration mit Gist oder Gitee
* [clippy](https://github.com/Eugeny/tabby-clippy) - ein Beispiel-Plugin, das einen die ganze Zeit nervt
* [workspace-manager](https://github.com/composer404/tabby-workspace-manager) - ermöglicht das Erstellen eigener Workspace-Profile auf Basis der angegebenen Konfiguration
* [search-in-browser](https://github.com/composer404/tabby-search-in-browser) - öffnet den Standard-Systembrowser mit einem Text, der aus dem Tabby Tab ausgewählt wurde

<a  name="themes"></a>

# Themen

* [hype](https://github.com/Eugeny/tabby-theme-hype) - ein von Hyper inspiriertes Thema
* [relaxed](https://github.com/Relaxed-Theme/relaxed-terminal-themes#terminus) - das entspannte Thema für Tabby
* [gruvbox](https://github.com/porkloin/terminus-theme-gruvbox)
* [windows10](https://www.npmjs.com/package/terminus-theme-windows10)
* [altair](https://github.com/yxuko/terminus-altair)

# Sponsoren <!-- omit in toc -->

[![](https://assets-production.packagecloud.io/assets/packagecloud-logo-light-scaled-26ce8e96060fddf74afbd4445e63ba35590d4aaa56edc98495bb390ef3cae0ae.png)](https://packagecloud.io)

[**packagecloud**](https://packagecloud.io) bietet kostenloses Debian/RPM-Repository-Hosting an

<a  name="contributing"></a>

# Beitragen

Pull Requests und Plugins sind willkommen!

Siehe [HACKING.md](https://github.com/Eugeny/tabby/blob/master/HACKING.md) und [API docs](https://docs.tabby.sh/) für Informationen über den Aufbau des Projekts und ein sehr kurzes Tutorial zur Plugin-Entwicklung.

---

<a  name="contributors"></a>

Dank geht an diese wunderbaren Menschen ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

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
  <tr>
    <td align="center"><a href="https://github.com/Me1onRind"><img src="https://avatars.githubusercontent.com/u/19531270?v=4?s=100" width="100px;" alt=""/><br /><sub><b>zZ</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=Me1onRind" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/tainoNZ"><img src="https://avatars.githubusercontent.com/u/49261322?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Aaron Davison</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=tainoNZ" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/composer404"><img src="https://avatars.githubusercontent.com/u/58251560?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Przemyslaw Kozik</b></sub></a><br /><a href="#design-composer404" title="Design">🎨</a></td>
    <td align="center"><a href="https://github.com/highfredo"><img src="https://avatars.githubusercontent.com/u/5951524?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Alfredo Arellano de la Fuente</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=highfredo" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/NessunKim"><img src="https://avatars.githubusercontent.com/u/12974079?v=4?s=100" width="100px;" alt=""/><br /><sub><b>MH Kim</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=NessunKim" title="Code">💻</a></td>
    <td align="center"><a href="https://discord.gg/4c5EVTBhtp"><img src="https://avatars.githubusercontent.com/u/40345645?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Marmota</b></sub></a><br /><a href="#design-jaimeadf" title="Design">🎨</a></td>
    <td align="center"><a href="https://ares.zone"><img src="https://avatars.githubusercontent.com/u/40336192?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Ares Andrew</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=TENX-S" title="Documentation">📖</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://usual.io/"><img src="https://avatars.githubusercontent.com/u/780052?v=4?s=100" width="100px;" alt=""/><br /><sub><b>George Korsnick</b></sub></a><br /><a href="#financial-gkor" title="Financial">💵</a></td>
    <td align="center"><a href="https://about.me/ulu"><img src="https://avatars.githubusercontent.com/u/872764?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Artem Smirnov</b></sub></a><br /><a href="#financial-uluhonolulu" title="Financial">💵</a></td>
    <td align="center"><a href="https://github.com/nevotheless"><img src="https://avatars.githubusercontent.com/u/779797?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Tim Kopplow</b></sub></a><br /><a href="#financial-nevotheless" title="Financial">💵</a></td>
    <td align="center"><a href="https://github.com/mrthock"><img src="https://avatars.githubusercontent.com/u/88901709?v=4?s=100" width="100px;" alt=""/><br /><sub><b>mrthock</b></sub></a><br /><a href="#financial-mrthock" title="Financial">💵</a></td>
    <td align="center"><a href="https://github.com/lrottach"><img src="https://avatars.githubusercontent.com/u/50323692?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Lukas Rottach</b></sub></a><br /><a href="#financial-lrottach" title="Financial">💵</a></td>
    <td align="center"><a href="https://github.com/boonkerz"><img src="https://avatars.githubusercontent.com/u/277321?v=4?s=100" width="100px;" alt=""/><br /><sub><b>boonkerz</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=boonkerz" title="Code">💻</a> <a href="#translation-boonkerz" title="Translation">🌍</a></td>
    <td align="center"><a href="https://github.com/milotype"><img src="https://avatars.githubusercontent.com/u/43657314?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Milo Ivir</b></sub></a><br /><a href="#translation-milotype" title="Translation">🌍</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/JasonCubic"><img src="https://avatars.githubusercontent.com/u/8921015?v=4?s=100" width="100px;" alt=""/><br /><sub><b>JasonCubic</b></sub></a><br /><a href="#design-JasonCubic" title="Design">🎨</a></td>
    <td align="center"><a href="https://github.com/MaxWaldorf"><img src="https://avatars.githubusercontent.com/u/15877853?v=4?s=100" width="100px;" alt=""/><br /><sub><b>MaxWaldorf</b></sub></a><br /><a href="#infra-MaxWaldorf" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
    <td align="center"><a href="https://github.com/mwz"><img src="https://avatars.githubusercontent.com/u/1190768?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Michael Wizner</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=mwz" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/mgrulich"><img src="https://avatars.githubusercontent.com/u/781036?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Martin</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=mgrulich" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/piersandro"><img src="https://avatars.githubusercontent.com/u/19996309?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Piersandro Guerrera</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=piersandro" title="Documentation">📖</a> <a href="#translation-piersandro" title="Translation">🌍</a></td>
    <td align="center"><a href="http://pingbase.cn"><img src="https://avatars.githubusercontent.com/u/19320096?v=4?s=100" width="100px;" alt=""/><br /><sub><b>X-0x01</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=X-0x01" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/Allenator"><img src="https://avatars.githubusercontent.com/u/11794943?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Allenator</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=Allenator" title="Documentation">📖</a></td>
  </tr>
  <tr>
    <td align="center"><a href="http://microhobby.com.br/blog"><img src="https://avatars.githubusercontent.com/u/2633321?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Matheus Castello</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=microhobby" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/Jai-JAP"><img src="https://avatars.githubusercontent.com/u/78354625?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Jai A P</b></sub></a><br /><a href="#platform-Jai-JAP" title="Packaging/porting to new platform">📦</a></td>
    <td align="center"><a href="https://blog.ysc3839.com"><img src="https://avatars.githubusercontent.com/u/12028138?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Richard Yu</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=ysc3839" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/artu-ole"><img src="https://avatars.githubusercontent.com/u/15938416?v=4?s=100" width="100px;" alt=""/><br /><sub><b>artu-ole</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=artu-ole" title="Code">💻</a></td>
    <td align="center"><a href="https://timagribanov.github.io/"><img src="https://avatars.githubusercontent.com/u/48593815?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Timofey Gribanov</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=TimaGribanov" title="Documentation">📖</a> <a href="#translation-TimaGribanov" title="Translation">🌍</a></td>
    <td align="center"><a href="https://git.christianbingman.com"><img src="https://avatars.githubusercontent.com/u/42191425?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Christian Bingman</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=ChristianBingman" title="Code">💻</a></td>
    <td align="center"><a href="http://zhangzhipeng2023.cn/"><img src="https://avatars.githubusercontent.com/u/5310853?v=4?s=100" width="100px;" alt=""/><br /><sub><b>zhipeng</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=Ox0400" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/woodmeal"><img src="https://avatars.githubusercontent.com/u/104011197?v=4?s=100" width="100px;" alt=""/><br /><sub><b>woodmeal</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=woodmeal" title="Code">💻</a></td>
    <td align="center"><a href="https://magiclike.codeberg.page/"><img src="https://avatars.githubusercontent.com/u/82117109?v=4?s=100" width="100px;" alt=""/><br /><sub><b>MagicLike</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=MagicLike" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/hisamafahri"><img src="https://avatars.githubusercontent.com/u/65691613?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Hisam Fahri</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=hisamafahri" title="Code">💻</a></td>
    <td align="center"><a href="https://liangchengj.com"><img src="https://avatars.githubusercontent.com/u/48881023?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Liangcheng Juves</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=LiangchengJ" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/attet"><img src="https://avatars.githubusercontent.com/u/1911416?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Atte Timonen</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=attet" title="Code">💻</a></td>
    <td align="center"><a href="https://www.linkedin.com/in/joaolmpinto/"><img src="https://avatars.githubusercontent.com/u/1143125?v=4?s=100" width="100px;" alt=""/><br /><sub><b>João Pinto</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=joaompinto" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/Qiming-Liu"><img src="https://avatars.githubusercontent.com/u/68600416?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Alan</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=Qiming-Liu" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://74th.tech/"><img src="https://avatars.githubusercontent.com/u/1060011?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Atsushi Morimoto</b></sub></a><br /><a href="#financial-74th" title="Financial">💵</a></td>
    <td align="center"><a href="https://arles.red/"><img src="https://avatars.githubusercontent.com/u/5369096?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Arles</b></sub></a><br /><a href="#financial-aarles" title="Financial">💵</a></td>
    <td align="center"><a href="https://pentestbook.six2dez.com/"><img src="https://avatars.githubusercontent.com/u/24670991?v=4?s=100" width="100px;" alt=""/><br /><sub><b>six2dez</b></sub></a><br /><a href="#financial-six2dez" title="Financial">💵</a></td>
    <td align="center"><a href="https://github.com/CandiceJoy"><img src="https://avatars.githubusercontent.com/u/8854890?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Candice</b></sub></a><br /><a href="#financial-CandiceJoy" title="Financial">💵</a></td>
    <td align="center"><a href="https://github.com/kingrowen"><img src="https://avatars.githubusercontent.com/u/13178700?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Rowen Willabus</b></sub></a><br /><a href="#financial-kingrowen" title="Financial">💵</a></td>
    <td align="center"><a href="https://hengy1.top/"><img src="https://avatars.githubusercontent.com/u/98681454?v=4?s=100" width="100px;" alt=""/><br /><sub><b>HengY1Coding✨</b></sub></a><br /><a href="#financial-HengY1Sky" title="Financial">💵</a></td>
    <td align="center"><a href="https://github.com/FrancisHG"><img src="https://avatars.githubusercontent.com/u/1611626?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Francis Gelderloos</b></sub></a><br /><a href="#financial-FrancisHG" title="Financial">💵</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/astromasoud"><img src="https://avatars.githubusercontent.com/u/18737721?v=4?s=100" width="100px;" alt=""/><br /><sub><b>astromasoud</b></sub></a><br /><a href="#financial-astromasoud" title="Financial">💵</a></td>
    <td align="center"><a href="https://spirit55555.dk/"><img src="https://avatars.githubusercontent.com/u/2357565?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Anders G. Jørgensen</b></sub></a><br /><a href="#financial-Spirit55555" title="Financial">💵</a></td>
    <td align="center"><a href="https://github.com/djradon"><img src="https://avatars.githubusercontent.com/u/5224156?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Dave Richardson</b></sub></a><br /><a href="#financial-djradon" title="Financial">💵</a></td>
    <td align="center"><a href="https://twitter.com/tpberntsen"><img src="https://avatars.githubusercontent.com/u/922318?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Thomas Peter Berntsen</b></sub></a><br /><a href="#financial-tpberntsen" title="Financial">💵</a></td>
    <td align="center"><a href="https://bandism.net/"><img src="https://avatars.githubusercontent.com/u/22633385?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Ikko Ashimine</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=eltociear" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/giejqf"><img src="https://avatars.githubusercontent.com/u/9211230?v=4?s=100" width="100px;" alt=""/><br /><sub><b>giejqf</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=giejqf" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/LacazeThomas"><img src="https://avatars.githubusercontent.com/u/19855907?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Thomas LACAZE</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=LacazeThomas" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://pochen.me/"><img src="https://avatars.githubusercontent.com/u/1329716?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Po Chen</b></sub></a><br /><a href="#financial-princemaple" title="Financial">💵</a></td>
    <td align="center"><a href="https://victorchandra.carrd.co/"><img src="https://avatars.githubusercontent.com/u/41635105?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Victor Chandra</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=mzmznasipadang" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/daniel347x"><img src="https://avatars.githubusercontent.com/u/309746?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Dan Nissenbaum</b></sub></a><br /><a href="#financial-daniel347x" title="Financial">💵</a></td>
    <td align="center"><a href="https://github.com/DunklerPhoenix"><img src="https://avatars.githubusercontent.com/u/1261305?v=4?s=100" width="100px;" alt=""/><br /><sub><b>RogueThorn</b></sub></a><br /><a href="#financial-DunklerPhoenix" title="Financial">💵</a></td>
    <td align="center"><a href="http://spenserblack.github.io"><img src="https://avatars.githubusercontent.com/u/8546709?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Spenser Black</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=spenserblack" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/zuedev"><img src="https://avatars.githubusercontent.com/u/24614929?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Alex</b></sub></a><br /><a href="#financial-zuedev" title="Financial">💵</a></td>
    <td align="center"><a href="https://hengy1.top/"><img src="https://avatars.githubusercontent.com/u/98681454?v=4?s=100" width="100px;" alt=""/><br /><sub><b>HengY1Coding✨</b></sub></a><br /><a href="#financial-HengY1Cola" title="Financial">💵</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://www.stackscale.com/"><img src="https://avatars.githubusercontent.com/u/195768?v=4?s=100" width="100px;" alt=""/><br /><sub><b>David Carrero</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=dcarrero" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/zhoro"><img src="https://avatars.githubusercontent.com/u/1105687?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Andrii Zhovtiak</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=zhoro" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/JohnMasoner"><img src="https://avatars.githubusercontent.com/u/42313377?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Mason Ma</b></sub></a><br /><a href="#financial-JohnMasoner" title="Financial">💵</a></td>
    <td align="center"><a href="https://github.com/ntimo"><img src="https://avatars.githubusercontent.com/u/6145026?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Timo</b></sub></a><br /><a href="#financial-ntimo" title="Financial">💵</a></td>
    <td align="center"><a href="https://www.linkedin.com/in/evinwatson/"><img src="https://avatars.githubusercontent.com/u/24227251?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Evin Watson</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=EvinRWatson" title="Documentation">📖</a></td>
    <td align="center"><a href="https://t.me/hendrjl"><img src="https://avatars.githubusercontent.com/u/15981200?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Hendra Juli</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=deulizealand" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/wkricowski"><img src="https://avatars.githubusercontent.com/u/36803521?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Wellinton Kricowski</b></sub></a><br /><a href="#financial-wkricowski" title="Financial">💵</a> <a href="https://github.com/Eugeny/tabby/commits?author=wkricowski" title="Documentation">📖</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/almzau"><img src="https://avatars.githubusercontent.com/u/29115846?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Allan</b></sub></a><br /><a href="#design-almzau" title="Design">🎨</a></td>
    <td align="center"><a href="https://oidamo.de"><img src="https://avatars.githubusercontent.com/u/17959794?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Benjamin Brandmeier</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=BenjaminBrandmeier" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/patric1025"><img src="https://avatars.githubusercontent.com/u/65654040?v=4?s=100" width="100px;" alt=""/><br /><sub><b>patric1025</b></sub></a><br /><a href="#translation-patric1025" title="Translation">🌍</a></td>
    <td align="center"><a href="https://github.com/hermitpopcorn"><img src="https://avatars.githubusercontent.com/u/16042129?v=4?s=100" width="100px;" alt=""/><br /><sub><b>hermitpopcorn</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=hermitpopcorn" title="Code">💻</a></td>
    <td align="center"><a href="https://joshuatz.com/"><img src="https://avatars.githubusercontent.com/u/17817563?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Joshua Tzucker</b></sub></a><br /><a href="#financial-joshuatz" title="Financial">💵</a></td>
    <td align="center"><a href="https://github.com/luxifr"><img src="https://avatars.githubusercontent.com/u/665715?v=4?s=100" width="100px;" alt=""/><br /><sub><b>luxifr</b></sub></a><br /><a href="#financial-luxifr" title="Financial">💵</a></td>
    <td align="center"><a href="https://github.com/ukulanne"><img src="https://avatars.githubusercontent.com/u/28586666?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Anne Summers</b></sub></a><br /><a href="#financial-ukulanne" title="Financial">💵</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

Dieses Projekt folgt der [all-contributors](https://github.com/all-contributors/all-contributors) Spezifikation. Beiträge jeglicher Art sind willkommen!
