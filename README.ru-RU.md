[![](docs/readme.png)](https://tabby.sh)


<p align="center">
  <a href="https://github.com/Eugeny/tabby/releases/latest"><img alt="GitHub All Releases" src="https://img.shields.io/github/downloads/eugeny/tabby/total.svg?label=DOWNLOADS&logo=github&style=for-the-badge"></a> &nbsp; <a href="https://nightly.link/Eugeny/tabby/workflows/build/master"><img src="https://shields.io/badge/-Nightly%20Builds-orange?logo=hackthebox&logoColor=fff&style=for-the-badge"/></a> &nbsp; <a href="https://matrix.to/#/#tabby-general:matrix.org"><img alt="Matrix" src="https://img.shields.io/matrix/tabby-general:matrix.org?logo=matrix&style=for-the-badge&color=magenta"></a> &nbsp <a href="https://translate.tabby.sh/"><img alt="Translate" src="https://shields.io/badge/Translate-UI-white?logo=googletranslate&style=for-the-badge&color=white&logoColor=fff"></a> &nbsp; <a href="https://twitter.com/eugeeeeny"><img alt="Twitter" src="https://shields.io/badge/Subscribe-News-blue?logo=twitter&style=for-the-badge&color=blue"></a>
</p>

<p align="center">
  <a href="https://ko-fi.com/J3J8KWTF">
    <img src="https://cdn.ko-fi.com/cdn/kofi3.png?v=2" width="150">
  </a>
</p>

----

### Загрузки:

* [Последняя версия](https://github.com/Eugeny/tabby/releases/latest)
* [Репозитории](https://packagecloud.io/eugeny/tabby): [Debian/Ubuntu](https://packagecloud.io/eugeny/tabby/install#bash-deb), [RPM](https://packagecloud.io/eugeny/tabby/install#bash-rpm)
* [Последний nightly-билд](https://nightly.link/Eugeny/tabby/workflows/build/master)

<br/>
<p align="center">
Этот README также доступен на: <a href="./README.md">English</a> <a href="./README.ko-KR.md">한국어</a> <a href="./README.zh-CN.md">简体中文</a> <a href="./README.it-IT.md">Italiano</a>
</p>

----

[**Tabby**](https://tabby.sh) (ранее **Terminus**) — широко конфигурируемый эмулятор терминала, SSH- и COM-клиент для Windows, macOS и Linux:

* Встроенный SSH- и Telnet-клиент и менеджер подключений;
* Встроенный последовтаельный терминал;
* Темы и цветовые схемы;
* Полностью настраеваемые сочетания клавиш;
* Панели;
* Запоминание вкладок;
* Поддержка PowerShell (and PS Core), WSL, Git-Bash, Cygwin, MSYS2, Cmder и CMD;
* Прямая передача файлов из и в SSH-сессии через Zmodem;
* Полная поддержка Unicode, включая символы двойной ширины;
* Не задыхается при быстром выводе;
* Полноценный опыт работы с shell на Windows, включая дополнение слов и команд по Tab (при помощи Clink);
* Втроенное защищённое хранилище для SSH-ключей и настроек;
* SSH-, SFTP- и Telnet-клиент доступен как [веб-приложение](https://tabby.sh/app) (также для [самостоятелньного хостинга](https://github.com/Eugeny/tabby-web)).

# Содержание <!-- omit in toc -->

- [Правда и ложь про Tabby](#правда-и-ложь-про-tabby)
- [Функции терминала](#функции-терминала)
- [SSH-клиент](#ssh-клиент)
- [Терминал последовательного порта](#терминал-последовательного-порта)
- [Портативность](#портативность)
- [Плагины](#плагины)
- [Темы](#темы)
- [Внести свой вклад](#внести-свой-вклад)

<a name="about"></a>

# Правда и ложь про Tabby

* **Правда:** Tabby — это альтернатива стандартному терминалу Windows (conhost), PowerShell ISE, PuTTY, macOS Terminal.app и iTerm.

* **Ложь:** Tabby — это не новая оболочка или замена MinGW или Cygwin. Также он нелёгок — если потребление ОЗУ крайне важно для вас, лучше взгляните на [Conemu](https://conemu.github.io) или [Alacritty](https://github.com/jwilm/alacritty).

<a name="terminal"></a>

# Функции терминала

![](docs/readme-terminal.png)

* Терминал V220 + различные дополнения;
* Деление окна на несколько панелей;
* Вкладки на любой стороне окна;
* Опционально закрепляемое окно с глобальной горячей клавишей для вызова («Quake console»);
* Определение прогресса процесса;
* Уведомления о завершении процессов;
* Защита от выполнения команд при вставке, предупреждения о вставке нескольких строк;
* Лигатуры шрифтов;
* Пользовательские профили оболочки;
* Опциональная ПКМ-вставка и копирование при выделении (в стиле PuTTY).

<a name="ssh"></a>
# SSH-клиент

![](docs/readme-ssh.png)

* SSH2-клиент с менеджером соединений;
* Проброс портов и X11;
* Управление автоматическими джамп-хостами;
* Проброс агента (включая Pageant и встроеный в Windows OpenSSH Agent);
* Скрипты для входа.

<a name="serial"></a>
# Терминал последовательного порта

* Сохранение соединений;
* Поддержка ввода readline;
* Опциональый побатный ввод HEX и вывод hexdump;
* Преобразование newline;
* Автоматическое восстановление соединения.

<a name="portable"></a>
# Портативность

На Windows Tabby будет работать в портативном режиме, если создать папку `data` там же, где расположен файл `Tabby.exe`.

<a name="plugins"></a>
# Плагины

Плагины и темы можно установить напрямую из Настроек Tabby.

* [clickable-links](https://github.com/Eugeny/tabby-clickable-links) — делает пути и URL в терминале гиперссылками;
* [docker](https://github.com/Eugeny/tabby-docker) — подключения к Docker-контейнерам;
* [title-control](https://github.com/kbjr/terminus-title-control) — позволяет изменять названия вкладок, добавляя префиксы, суффиксы и позволяя удалять строки;
* [quick-cmds](https://github.com/Domain/terminus-quick-cmds) — быстро передаёт команды в одну или все вкладки терминала;
* [save-output](https://github.com/Eugeny/tabby-save-output) — запись вывода терминала в файл;
* [sync-config](https://github.com/starxg/terminus-sync-config) — синхронизация конфига в Gist или Gitee;
* [clippy](https://github.com/Eugeny/tabby-clippy) — плагин-пример, который постоянно будет вас бесить;
* [workspace-manager](https://github.com/composer404/tabby-workspace-manager) — позволяет создавать пользовательские провили рабочего окружеиня на основе конфига;
* [search-in-browser](https://github.com/composer404/tabby-search-in-browser) — открывает браузер по умолчанию с текстом, выделенном во вкладке Tabby.

<a name="themes"></a>
# Темы

* [hype](https://github.com/Eugeny/tabby-theme-hype) — тема, вдохновлённая Hyper;
* [relaxed](https://github.com/Relaxed-Theme/relaxed-terminal-themes#terminus) — тема Relaxed для Tabby;
* [gruvbox](https://github.com/porkloin/terminus-theme-gruvbox);
* [windows10](https://www.npmjs.com/package/terminus-theme-windows10);
* [altair](https://github.com/yxuko/terminus-altair).

# Спонсоры <!-- omit in toc -->

[![](https://assets-production.packagecloud.io/assets/packagecloud-logo-light-scaled-26ce8e96060fddf74afbd4445e63ba35590d4aaa56edc98495bb390ef3cae0ae.png)](https://packagecloud.io)

[**packagecloud**](https://packagecloud.io) предоставил бесплатный хостинг для Debian/RPM репозитория.

<a name="contributing"></a>
# Внести свой вклад

Pull-запросы и плагины приветствуются!

Взгляните на [HACKING.md](https://github.com/Eugeny/tabby/blob/master/HACKING.md) и [API docs](https://docs.tabby.sh/), чтобы понять, как устроен проект, и ради очень краткого туториала по созданию плагинов.

---
<a name="contributors"></a>

Огромное спасибо этим прекрасным людям ([описание эмодзи](https://allcontributors.org/docs/en/emoji-key)):

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
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

Данный проект следует заветам [all-contributors](https://github.com/all-contributors/all-contributors). Любые созидатели приветствуются!

<img src="https://ga-beacon.appspot.com/UA-3278102-18/github/readme" width="1"/>
