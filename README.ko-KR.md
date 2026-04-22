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

### 다운로드:

* [Latest release](https://github.com/Eugeny/tabby/releases/latest)
* [Repositories](https://packagecloud.io/eugeny/tabby): [Debian/Ubuntu-based](https://packagecloud.io/eugeny/tabby/install#bash-deb), [RPM-based](https://packagecloud.io/eugeny/tabby/install#bash-rpm)
* [Latest nightly build](https://nightly.link/Eugeny/tabby/workflows/build/master)

<br/>
<p align="center">
This README is also available in: <a  href="./README.md">:gb: English</a> · <a  href="./README.es-ES.md">:es: Spanish</a> · <a  href="./README.ru-RU.md">:ru: Русский</a> · <a  href="./README.zh-CN.md">:cn: 简体中文</a> · <a  href="./README.it-IT.md">:it: Italiano</a> · <a href="./README.de-DE.md">:de: Deutsch</a> · <a href="./README.ja-JP.md">:jp: 日本語</a> · <a href="./README.id-ID.md">:id: Bahasa Indonesia</a> · <a href="./README.pt-BR.md">:brazil: Português</a> · <a href="./README.pl-PL.md">:poland: Polski</a>
</p>

----

**Tabby** (구 **Terminus**)는 Windows, macOS 및 Linux용으로 뛰어난 구성의 터미널 에뮬레이터, SSH 및 시리얼 클라이언트입니다.

* 통합 SSH 클라이언트 및 연결 관리자
* 통합 시리얼 터미널
* 테마 및 색 구성표
* 전체 구성이 가능한 단축키 및 다중 코드 단축키
* 창 분할
* 이전 탭 사용을 기억
* PowerShell (및 PS Core), WSL, Git-Bash, Cygwin, Cmder 및 CMD 지원
* Zmodem을 통한 SSH 세션 간의 직접 파일 전송
* 2바이트 문자를 포함한 전체 유니코드 지원
* 빠르게 출력되는 것에 대해 휩쓸리지 않음
* 탭 완성을 포함한 Windows에서의 적절한 셸 환경 (Clink을 통해)
* SSH 시크릿 및 구성을 위한 통합 암호화 컨테이너

# 목차 <!-- omit in toc -->

- [Tabby는 무엇인가](#tabby는-무엇인가)
- [터미널 기능](#터미널-기능)
- [SSH 클라이언트](#ssh-클라이언트)
- [시리얼 터미널](#시리얼-터미널)
- [포터블](#포터블)
- [플러그인](#플러그인)
- [테마](#테마)
- [기여](#기여)

<a name="about"></a>

# Tabby는 무엇인가

* **Tabby는** Windows의 표준 터미널 (conhost), PowerShell ISE, PuTTY 또는 iTerm의 대안 프로그램입니다.

* **Tabby는** 새로운 셸이나 MinGW 또는 Cygwin을 대체하지 **않습니다**. 가볍지도 않습니다. - RAM 사용량이 중요한 경우, [Conemu](https://conemu.github.io) 또는 [Alacritty](https://github.com/jwilm/alacritty)를 고려하십시오.

<a name="terminal"></a>

# 터미널 기능

![](docs/readme-terminal.png)

* A VT220 터미널 + 다양한 확장
* 여러 개의 분할 창 중첩
* 모든 측면에 탭이 위치함
* 전역 스폰 단축키가 있는 도킹 가능한 윈도우 ("Quake console")
* 진행률 탐지
* 프로세스 완료 시 알림
* 괄호 붙여넣기, 여러 줄 붙여넣기 경고
* 폰트 합자(ligatures)
* 커스텀 셸 프로필
* RMB 붙여넣기 및 복사 선택 옵션 (PuTTY 스타일)

<a name="ssh"></a>
# SSH 클라이언트

![](docs/readme-ssh.png)

* 연결 관리자가 있는 SSH2 클라이언트
* X11 및 포트 포워딩
* 자동 jump 호스트 관리
* 에이전트 전달 (Pageant 및 Windows 기본 OpenSSH 에이전트 포함)
* 로그인 스크립트

<a name="serial"></a>
# 시리얼 터미널

* 연결 저장
* Readline 입력 지원
* 선택적 hex byte별 입력 및 hexdump 출력
* 개행 변환
* 자동 재접속

<a name="portable"></a>
# 포터블

`Tabby.exe`가 있는 동일한 위치에 `data` 폴더를 생성하면 Windows에서 Tabby가 포터블 앱으로 실행됩니다.

<a name="plugins"></a>
# 플러그인

플러그인과 테마는 Tabby 내부의 설정에서 직접 설치할 수 있습니다.

* [clickable-links](https://github.com/Eugeny/tabby-clickable-links) - 터미널의 경로 및 URL을 클릭 가능하게
* [docker](https://github.com/Eugeny/tabby-docker) - Docker 컨테이너에 연결
* [title-control](https://github.com/kbjr/terminus-title-control) - 접두사, 접미사 및/또는 문자열 제거를 제공하여 터미널 탭의 제목을 수정
* [quick-cmds](https://github.com/Domain/terminus-quick-cmds) - 하나 또는 모든 터미널 탭에 신속한 명령 전송
* [save-output](https://github.com/Eugeny/tabby-save-output) - 터미널 출력을 파일에 기록
* [sync-config](https://github.com/starxg/terminus-sync-config) - 구성을 Gist 또는 Gitee에 동기화
* [clippy](https://github.com/Eugeny/tabby-clippy) - 항상 당신을 귀찮게 하는 예제 플러그인
* [workspace-manager](https://github.com/composer404/tabby-workspace-manager) - 주어진 구성을 기반으로 사용자 정의 작업 공간 프로필을 생성할 수 있습니다
* [search-in-browser](https://github.com/composer404/tabby-search-in-browser) - Tabby의 탭에서 선택한 텍스트로 기본 시스템 브라우저를 엽니다
* [sftp-tab](https://github.com/wljince007/tabby-sftp-tab) - SecureCRT와 유사하게 SSH 연결에 대한 SFTP 탭을 엽니다.
* [web-auth-handler](https://github.com/Jazzmoon/tabby-web-auth-handler) - 앱 내 웹 인증 팝업 (주로 warpgate 브라우저 인증을 위해 구축)
* [mcp-server](https://github.com/thuanpham582002/tabby-mcp-server) - Cursor 및 Windsurf와 같은 MCP 클라이언트를 통해 AI 어시스턴트와 원활하게 연결되는 Tabby용 강력한 모델 컨텍스트 프로토콜 서버 통합으로, 지능형 AI 기능으로 터미널 워크플로우를 향상시킵니다.
<a name="themes"></a>
# 테마

* [hype](https://github.com/Eugeny/tabby-theme-hype) - Hyper에서 영감을 받은 테마
* [relaxed](https://github.com/Relaxed-Theme/relaxed-terminal-themes#terminus) - Tabby를 위해 여유로움을 제공하는 테마
* [gruvbox](https://github.com/porkloin/terminus-theme-gruvbox)
* [windows10](https://www.npmjs.com/package/terminus-theme-windows10)
* [altair](https://github.com/yxuko/terminus-altair)

# 스폰서 <!-- omit in toc -->

[![](https://assets-production.packagecloud.io/assets/packagecloud-logo-light-scaled-26ce8e96060fddf74afbd4445e63ba35590d4aaa56edc98495bb390ef3cae0ae.png)](https://packagecloud.io)

[**packagecloud**](https://packagecloud.io)가 무료 Debian/RPM 저장소 호스팅을 제공하였습니다.

<a name="contributing"></a>
# 기여

Pull requests and plugins are welcome!

프로젝트 배치 방법에 대한 자세한 내용과 매우 간단한 플러그인 개발 튜토리얼은 [HACKING.md](https://github.com/Eugeny/tabby/blob/master/HACKING.md) 및 [API docs](https://docs.tabby.sh/)를 참조하십시오.

---
<a name="contributors"></a>

여기 있는 멋진 사람들에게 진심으로 감사합니다. ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="http://www.russellmyers.com"><img src="https://avatars2.githubusercontent.com/u/184085?v=4?s=100" width="100px;" alt="Russell Myers"/><br /><sub><b>Russell Myers</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=mezner" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.morwire.com"><img src="https://avatars1.githubusercontent.com/u/3991658?v=4?s=100" width="100px;" alt="Austin Warren"/><br /><sub><b>Austin Warren</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=ehwarren" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Drachenkaetzchen"><img src="https://avatars1.githubusercontent.com/u/162974?v=4?s=100" width="100px;" alt="Felicia Hummel"/><br /><sub><b>Felicia Hummel</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=Drachenkaetzchen" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/mikemaccana"><img src="https://avatars2.githubusercontent.com/u/172594?v=4?s=100" width="100px;" alt="Mike MacCana"/><br /><sub><b>Mike MacCana</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=mikemaccana" title="Tests">⚠️</a> <a href="#design-mikemaccana" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/yxuko"><img src="https://avatars1.githubusercontent.com/u/1786317?v=4?s=100" width="100px;" alt="Yacine Kanzari"/><br /><sub><b>Yacine Kanzari</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=yxuko" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/BBJip"><img src="https://avatars2.githubusercontent.com/u/32908927?v=4?s=100" width="100px;" alt="BBJip"/><br /><sub><b>BBJip</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=BBJip" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Futagirl"><img src="https://avatars2.githubusercontent.com/u/33533958?v=4?s=100" width="100px;" alt="Futagirl"/><br /><sub><b>Futagirl</b></sub></a><br /><a href="#design-Futagirl" title="Design">🎨</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://www.levrik.io"><img src="https://avatars3.githubusercontent.com/u/9491603?v=4?s=100" width="100px;" alt="Levin Rickert"/><br /><sub><b>Levin Rickert</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=levrik" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://kwonoj.github.io"><img src="https://avatars2.githubusercontent.com/u/1210596?v=4?s=100" width="100px;" alt="OJ Kwon"/><br /><sub><b>OJ Kwon</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=kwonoj" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Domain"><img src="https://avatars2.githubusercontent.com/u/903197?v=4?s=100" width="100px;" alt="domain"/><br /><sub><b>domain</b></sub></a><br /><a href="#plugin-Domain" title="Plugin/utility libraries">🔌</a> <a href="https://github.com/Eugeny/tabby/commits?author=Domain" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.jbrumond.me"><img src="https://avatars1.githubusercontent.com/u/195127?v=4?s=100" width="100px;" alt="James Brumond"/><br /><sub><b>James Brumond</b></sub></a><br /><a href="#plugin-kbjr" title="Plugin/utility libraries">🔌</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.growingwiththeweb.com"><img src="https://avatars0.githubusercontent.com/u/2193314?v=4?s=100" width="100px;" alt="Daniel Imms"/><br /><sub><b>Daniel Imms</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=Tyriar" title="Code">💻</a> <a href="#plugin-Tyriar" title="Plugin/utility libraries">🔌</a> <a href="https://github.com/Eugeny/tabby/commits?author=Tyriar" title="Tests">⚠️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/baflo"><img src="https://avatars2.githubusercontent.com/u/834350?v=4?s=100" width="100px;" alt="Florian Bachmann"/><br /><sub><b>Florian Bachmann</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=baflo" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://michael-kuehnel.de"><img src="https://avatars2.githubusercontent.com/u/441011?v=4?s=100" width="100px;" alt="Michael Kühnel"/><br /><sub><b>Michael Kühnel</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=mischah" title="Code">💻</a> <a href="#design-mischah" title="Design">🎨</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/NieLeben"><img src="https://avatars3.githubusercontent.com/u/47182955?v=4?s=100" width="100px;" alt="Tilmann Meyer"/><br /><sub><b>Tilmann Meyer</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=NieLeben" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.jubeat.net"><img src="https://avatars3.githubusercontent.com/u/11289158?v=4?s=100" width="100px;" alt="PM Extra"/><br /><sub><b>PM Extra</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/issues?q=author%3APMExtra" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://jjuhas.keybase.pub//"><img src="https://avatars1.githubusercontent.com/u/6438760?v=4?s=100" width="100px;" alt="Jonathan"/><br /><sub><b>Jonathan</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=IgnusG" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://hans-koch.me"><img src="https://avatars0.githubusercontent.com/u/1093709?v=4?s=100" width="100px;" alt="Hans Koch"/><br /><sub><b>Hans Koch</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=hammster" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://thepuzzlemaker.info"><img src="https://avatars3.githubusercontent.com/u/12666617?v=4?s=100" width="100px;" alt="Dak Smyth"/><br /><sub><b>Dak Smyth</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=ThePuzzlemaker" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://yfwz100.github.io"><img src="https://avatars2.githubusercontent.com/u/983211?v=4?s=100" width="100px;" alt="Wang Zhi"/><br /><sub><b>Wang Zhi</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=yfwz100" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/jack1142"><img src="https://avatars0.githubusercontent.com/u/6032823?v=4?s=100" width="100px;" alt="jack1142"/><br /><sub><b>jack1142</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=jack1142" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/hdougie"><img src="https://avatars1.githubusercontent.com/u/450799?v=4?s=100" width="100px;" alt="Howie Douglas"/><br /><sub><b>Howie Douglas</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=hdougie" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://chriskaczor.com"><img src="https://avatars2.githubusercontent.com/u/180906?v=4?s=100" width="100px;" alt="Chris Kaczor"/><br /><sub><b>Chris Kaczor</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=ckaczor" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.boxmein.net"><img src="https://avatars1.githubusercontent.com/u/358714?v=4?s=100" width="100px;" alt="Johannes Kadak"/><br /><sub><b>Johannes Kadak</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=boxmein" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/LeSeulArtichaut"><img src="https://avatars1.githubusercontent.com/u/38361244?v=4?s=100" width="100px;" alt="LeSeulArtichaut"/><br /><sub><b>LeSeulArtichaut</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=LeSeulArtichaut" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/CyrilTaylor"><img src="https://avatars0.githubusercontent.com/u/12631466?v=4?s=100" width="100px;" alt="Cyril Taylor"/><br /><sub><b>Cyril Taylor</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=CyrilTaylor" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/nstefanou"><img src="https://avatars3.githubusercontent.com/u/51129173?v=4?s=100" width="100px;" alt="nstefanou"/><br /><sub><b>nstefanou</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=nstefanou" title="Code">💻</a> <a href="#plugin-nstefanou" title="Plugin/utility libraries">🔌</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/orin220444"><img src="https://avatars3.githubusercontent.com/u/30747229?v=4?s=100" width="100px;" alt="orin220444"/><br /><sub><b>orin220444</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=orin220444" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Goobles"><img src="https://avatars3.githubusercontent.com/u/8776771?v=4?s=100" width="100px;" alt="Gobius Dolhain"/><br /><sub><b>Gobius Dolhain</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=Goobles" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/3l0w"><img src="https://avatars2.githubusercontent.com/u/37798980?v=4?s=100" width="100px;" alt="Gwilherm Folliot"/><br /><sub><b>Gwilherm Folliot</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=3l0w" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Dimitory"><img src="https://avatars0.githubusercontent.com/u/475955?v=4?s=100" width="100px;" alt="Dmitry Pronin"/><br /><sub><b>Dmitry Pronin</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=dimitory" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/JonathanBeverley"><img src="https://avatars1.githubusercontent.com/u/20328966?v=4?s=100" width="100px;" alt="Jonathan Beverley"/><br /><sub><b>Jonathan Beverley</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=JonathanBeverley" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/zend"><img src="https://avatars1.githubusercontent.com/u/25160?v=4?s=100" width="100px;" alt="Zenghai Liang"/><br /><sub><b>Zenghai Liang</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=zend" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://about.me/matishadow"><img src="https://avatars0.githubusercontent.com/u/9083085?v=4?s=100" width="100px;" alt="Mateusz Tracz"/><br /><sub><b>Mateusz Tracz</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=matishadow" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://zergpool.com"><img src="https://avatars3.githubusercontent.com/u/36234677?v=4?s=100" width="100px;" alt="pinpin"/><br /><sub><b>pinpin</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=pinpins" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/TakuroOnoda"><img src="https://avatars0.githubusercontent.com/u/1407926?v=4?s=100" width="100px;" alt="Takuro Onoda"/><br /><sub><b>Takuro Onoda</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=TakuroOnoda" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/frauhottelmann"><img src="https://avatars2.githubusercontent.com/u/902705?v=4?s=100" width="100px;" alt="frauhottelmann"/><br /><sub><b>frauhottelmann</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=frauhottelmann" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://patalong.pl"><img src="https://avatars.githubusercontent.com/u/29167842?v=4?s=100" width="100px;" alt="Piotr Patalong"/><br /><sub><b>Piotr Patalong</b></sub></a><br /><a href="#design-VectorKappa" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/clarkwang"><img src="https://avatars.githubusercontent.com/u/157076?v=4?s=100" width="100px;" alt="Clark Wang"/><br /><sub><b>Clark Wang</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=clarkwang" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/iamchating"><img src="https://avatars.githubusercontent.com/u/7088153?v=4?s=100" width="100px;" alt="iamchating"/><br /><sub><b>iamchating</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=iamchating" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/starxg"><img src="https://avatars.githubusercontent.com/u/34997494?v=4?s=100" width="100px;" alt="starxg"/><br /><sub><b>starxg</b></sub></a><br /><a href="#plugin-starxg" title="Plugin/utility libraries">🔌</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://hashnote.net/"><img src="https://avatars.githubusercontent.com/u/546312?v=4?s=100" width="100px;" alt="Alisue"/><br /><sub><b>Alisue</b></sub></a><br /><a href="#design-lambdalisue" title="Design">🎨</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ydcool"><img src="https://avatars.githubusercontent.com/u/5668295?v=4?s=100" width="100px;" alt="Dominic Yin"/><br /><sub><b>Dominic Yin</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=ydcool" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/bdr99"><img src="https://avatars.githubusercontent.com/u/2292715?v=4?s=100" width="100px;" alt="Brandon Rothweiler"/><br /><sub><b>Brandon Rothweiler</b></sub></a><br /><a href="#design-bdr99" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://git.io/JnP49"><img src="https://avatars.githubusercontent.com/u/63876444?v=4?s=100" width="100px;" alt="Logic Machine"/><br /><sub><b>Logic Machine</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=logicmachine123" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/cypherbits"><img src="https://avatars.githubusercontent.com/u/10424900?v=4?s=100" width="100px;" alt="cypherbits"/><br /><sub><b>cypherbits</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=cypherbits" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://modulolotus.net"><img src="https://avatars.githubusercontent.com/u/946421?v=4?s=100" width="100px;" alt="Matthew Davidson"/><br /><sub><b>Matthew Davidson</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=KingMob" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/al-wi"><img src="https://avatars.githubusercontent.com/u/11092199?v=4?s=100" width="100px;" alt="Alexander Wiedemann"/><br /><sub><b>Alexander Wiedemann</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=al-wi" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.notion.so/3d45c6bd2cbd4f938873a4bd12e23375"><img src="https://avatars.githubusercontent.com/u/59506394?v=4?s=100" width="100px;" alt="장보연"/><br /><sub><b>장보연</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=BoYeonJang" title="Documentation">📖</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Me1onRind"><img src="https://avatars.githubusercontent.com/u/19531270?v=4?s=100" width="100px;" alt="zZ"/><br /><sub><b>zZ</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=Me1onRind" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/tainoNZ"><img src="https://avatars.githubusercontent.com/u/49261322?v=4?s=100" width="100px;" alt="Aaron Davison"/><br /><sub><b>Aaron Davison</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=tainoNZ" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/composer404"><img src="https://avatars.githubusercontent.com/u/58251560?v=4?s=100" width="100px;" alt="Przemyslaw Kozik"/><br /><sub><b>Przemyslaw Kozik</b></sub></a><br /><a href="#design-composer404" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/highfredo"><img src="https://avatars.githubusercontent.com/u/5951524?v=4?s=100" width="100px;" alt="Alfredo Arellano de la Fuente"/><br /><sub><b>Alfredo Arellano de la Fuente</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=highfredo" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/NessunKim"><img src="https://avatars.githubusercontent.com/u/12974079?v=4?s=100" width="100px;" alt="MH Kim"/><br /><sub><b>MH Kim</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=NessunKim" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://discord.gg/4c5EVTBhtp"><img src="https://avatars.githubusercontent.com/u/40345645?v=4?s=100" width="100px;" alt="Marmota"/><br /><sub><b>Marmota</b></sub></a><br /><a href="#design-jaimeadf" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://ares.zone"><img src="https://avatars.githubusercontent.com/u/40336192?v=4?s=100" width="100px;" alt="Ares Andrew"/><br /><sub><b>Ares Andrew</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=TENX-S" title="Documentation">📖</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://usual.io/"><img src="https://avatars.githubusercontent.com/u/780052?v=4?s=100" width="100px;" alt="George Korsnick"/><br /><sub><b>George Korsnick</b></sub></a><br /><a href="#financial-gkor" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://about.me/ulu"><img src="https://avatars.githubusercontent.com/u/872764?v=4?s=100" width="100px;" alt="Artem Smirnov"/><br /><sub><b>Artem Smirnov</b></sub></a><br /><a href="#financial-uluhonolulu" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/nevotheless"><img src="https://avatars.githubusercontent.com/u/779797?v=4?s=100" width="100px;" alt="Tim Kopplow"/><br /><sub><b>Tim Kopplow</b></sub></a><br /><a href="#financial-nevotheless" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/mrthock"><img src="https://avatars.githubusercontent.com/u/88901709?v=4?s=100" width="100px;" alt="mrthock"/><br /><sub><b>mrthock</b></sub></a><br /><a href="#financial-mrthock" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/lrottach"><img src="https://avatars.githubusercontent.com/u/50323692?v=4?s=100" width="100px;" alt="Lukas Rottach"/><br /><sub><b>Lukas Rottach</b></sub></a><br /><a href="#financial-lrottach" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/boonkerz"><img src="https://avatars.githubusercontent.com/u/277321?v=4?s=100" width="100px;" alt="boonkerz"/><br /><sub><b>boonkerz</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=boonkerz" title="Code">💻</a> <a href="#translation-boonkerz" title="Translation">🌍</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/milotype"><img src="https://avatars.githubusercontent.com/u/43657314?v=4?s=100" width="100px;" alt="Milo Ivir"/><br /><sub><b>Milo Ivir</b></sub></a><br /><a href="#translation-milotype" title="Translation">🌍</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/JasonCubic"><img src="https://avatars.githubusercontent.com/u/8921015?v=4?s=100" width="100px;" alt="JasonCubic"/><br /><sub><b>JasonCubic</b></sub></a><br /><a href="#design-JasonCubic" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/MaxWaldorf"><img src="https://avatars.githubusercontent.com/u/15877853?v=4?s=100" width="100px;" alt="MaxWaldorf"/><br /><sub><b>MaxWaldorf</b></sub></a><br /><a href="#infra-MaxWaldorf" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/mwz"><img src="https://avatars.githubusercontent.com/u/1190768?v=4?s=100" width="100px;" alt="Michael Wizner"/><br /><sub><b>Michael Wizner</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=mwz" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/mgrulich"><img src="https://avatars.githubusercontent.com/u/781036?v=4?s=100" width="100px;" alt="Martin"/><br /><sub><b>Martin</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=mgrulich" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/piersandro"><img src="https://avatars.githubusercontent.com/u/19996309?v=4?s=100" width="100px;" alt="Piersandro Guerrera"/><br /><sub><b>Piersandro Guerrera</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=piersandro" title="Documentation">📖</a> <a href="#translation-piersandro" title="Translation">🌍</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/0x973"><img src="https://avatars.githubusercontent.com/u/19320096?v=4?s=100" width="100px;" alt="0x973"/><br /><sub><b>0x973</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=0x973" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Allenator"><img src="https://avatars.githubusercontent.com/u/11794943?v=4?s=100" width="100px;" alt="Allenator"/><br /><sub><b>Allenator</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=Allenator" title="Documentation">📖</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="http://microhobby.com.br/blog"><img src="https://avatars.githubusercontent.com/u/2633321?v=4?s=100" width="100px;" alt="Matheus Castello"/><br /><sub><b>Matheus Castello</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=microhobby" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Jai-JAP"><img src="https://avatars.githubusercontent.com/u/78354625?v=4?s=100" width="100px;" alt="Jai A P"/><br /><sub><b>Jai A P</b></sub></a><br /><a href="#platform-Jai-JAP" title="Packaging/porting to new platform">📦</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://blog.ysc3839.com"><img src="https://avatars.githubusercontent.com/u/12028138?v=4?s=100" width="100px;" alt="Richard Yu"/><br /><sub><b>Richard Yu</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=ysc3839" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/artu-ole"><img src="https://avatars.githubusercontent.com/u/15938416?v=4?s=100" width="100px;" alt="artu-ole"/><br /><sub><b>artu-ole</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=artu-ole" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://timagribanov.github.io/"><img src="https://avatars.githubusercontent.com/u/48593815?v=4?s=100" width="100px;" alt="Timofey Gribanov"/><br /><sub><b>Timofey Gribanov</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=TimaGribanov" title="Documentation">📖</a> <a href="#translation-TimaGribanov" title="Translation">🌍</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://git.christianbingman.com"><img src="https://avatars.githubusercontent.com/u/42191425?v=4?s=100" width="100px;" alt="Christian Bingman"/><br /><sub><b>Christian Bingman</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=ChristianBingman" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://zhangzhipeng2023.cn/"><img src="https://avatars.githubusercontent.com/u/5310853?v=4?s=100" width="100px;" alt="zhipeng"/><br /><sub><b>zhipeng</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=Ox0400" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/woodmeal"><img src="https://avatars.githubusercontent.com/u/104011197?v=4?s=100" width="100px;" alt="woodmeal"/><br /><sub><b>woodmeal</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=woodmeal" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://magiclike.codeberg.page/"><img src="https://avatars.githubusercontent.com/u/82117109?v=4?s=100" width="100px;" alt="MagicLike"/><br /><sub><b>MagicLike</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=MagicLike" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/hisamafahri"><img src="https://avatars.githubusercontent.com/u/65691613?v=4?s=100" width="100px;" alt="Hisam Fahri"/><br /><sub><b>Hisam Fahri</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=hisamafahri" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://liangchengj.com"><img src="https://avatars.githubusercontent.com/u/48881023?v=4?s=100" width="100px;" alt="Liangcheng Juves"/><br /><sub><b>Liangcheng Juves</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=LiangchengJ" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/attet"><img src="https://avatars.githubusercontent.com/u/1911416?v=4?s=100" width="100px;" alt="Atte Timonen"/><br /><sub><b>Atte Timonen</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=attet" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/joaolmpinto/"><img src="https://avatars.githubusercontent.com/u/1143125?v=4?s=100" width="100px;" alt="João Pinto"/><br /><sub><b>João Pinto</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=joaompinto" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Qiming-Liu"><img src="https://avatars.githubusercontent.com/u/68600416?v=4?s=100" width="100px;" alt="Alan"/><br /><sub><b>Alan</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=Qiming-Liu" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://74th.tech/"><img src="https://avatars.githubusercontent.com/u/1060011?v=4?s=100" width="100px;" alt="Atsushi Morimoto"/><br /><sub><b>Atsushi Morimoto</b></sub></a><br /><a href="#financial-74th" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://arles.red/"><img src="https://avatars.githubusercontent.com/u/5369096?v=4?s=100" width="100px;" alt="Arles"/><br /><sub><b>Arles</b></sub></a><br /><a href="#financial-aarles" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://pentestbook.six2dez.com/"><img src="https://avatars.githubusercontent.com/u/24670991?v=4?s=100" width="100px;" alt="six2dez"/><br /><sub><b>six2dez</b></sub></a><br /><a href="#financial-six2dez" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/CandiceJoy"><img src="https://avatars.githubusercontent.com/u/8854890?v=4?s=100" width="100px;" alt="Candice"/><br /><sub><b>Candice</b></sub></a><br /><a href="#financial-CandiceJoy" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/kingrowen"><img src="https://avatars.githubusercontent.com/u/13178700?v=4?s=100" width="100px;" alt="Rowen Willabus"/><br /><sub><b>Rowen Willabus</b></sub></a><br /><a href="#financial-kingrowen" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://hengy1.top/"><img src="https://avatars.githubusercontent.com/u/98681454?v=4?s=100" width="100px;" alt="HengY1Coding✨"/><br /><sub><b>HengY1Coding✨</b></sub></a><br /><a href="#financial-HengY1Sky" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/FrancisHG"><img src="https://avatars.githubusercontent.com/u/1611626?v=4?s=100" width="100px;" alt="Francis Gelderloos"/><br /><sub><b>Francis Gelderloos</b></sub></a><br /><a href="#financial-FrancisHG" title="Financial">💵</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/astromasoud"><img src="https://avatars.githubusercontent.com/u/18737721?v=4?s=100" width="100px;" alt="astromasoud"/><br /><sub><b>astromasoud</b></sub></a><br /><a href="#financial-astromasoud" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://spirit55555.dk/"><img src="https://avatars.githubusercontent.com/u/2357565?v=4?s=100" width="100px;" alt="Anders G. Jørgensen"/><br /><sub><b>Anders G. Jørgensen</b></sub></a><br /><a href="#financial-Spirit55555" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/djradon"><img src="https://avatars.githubusercontent.com/u/5224156?v=4?s=100" width="100px;" alt="Dave Richardson"/><br /><sub><b>Dave Richardson</b></sub></a><br /><a href="#financial-djradon" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://twitter.com/tpberntsen"><img src="https://avatars.githubusercontent.com/u/922318?v=4?s=100" width="100px;" alt="Thomas Peter Berntsen"/><br /><sub><b>Thomas Peter Berntsen</b></sub></a><br /><a href="#financial-tpberntsen" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://bandism.net/"><img src="https://avatars.githubusercontent.com/u/22633385?v=4?s=100" width="100px;" alt="Ikko Ashimine"/><br /><sub><b>Ikko Ashimine</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=eltociear" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/giejqf"><img src="https://avatars.githubusercontent.com/u/9211230?v=4?s=100" width="100px;" alt="giejqf"/><br /><sub><b>giejqf</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=giejqf" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/LacazeThomas"><img src="https://avatars.githubusercontent.com/u/19855907?v=4?s=100" width="100px;" alt="Thomas LACAZE"/><br /><sub><b>Thomas LACAZE</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=LacazeThomas" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://pochen.me/"><img src="https://avatars.githubusercontent.com/u/1329716?v=4?s=100" width="100px;" alt="Po Chen"/><br /><sub><b>Po Chen</b></sub></a><br /><a href="#financial-princemaple" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://victorchandra.carrd.co/"><img src="https://avatars.githubusercontent.com/u/41635105?v=4?s=100" width="100px;" alt="Victor Chandra"/><br /><sub><b>Victor Chandra</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=mzmznasipadang" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/daniel347x"><img src="https://avatars.githubusercontent.com/u/309746?v=4?s=100" width="100px;" alt="Dan Nissenbaum"/><br /><sub><b>Dan Nissenbaum</b></sub></a><br /><a href="#financial-daniel347x" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/DunklerPhoenix"><img src="https://avatars.githubusercontent.com/u/1261305?v=4?s=100" width="100px;" alt="RogueThorn"/><br /><sub><b>RogueThorn</b></sub></a><br /><a href="#financial-DunklerPhoenix" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://spenserblack.github.io"><img src="https://avatars.githubusercontent.com/u/8546709?v=4?s=100" width="100px;" alt="Spenser Black"/><br /><sub><b>Spenser Black</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=spenserblack" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/zuedev"><img src="https://avatars.githubusercontent.com/u/24614929?v=4?s=100" width="100px;" alt="Alex"/><br /><sub><b>Alex</b></sub></a><br /><a href="#financial-zuedev" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://hengy1.top/"><img src="https://avatars.githubusercontent.com/u/98681454?v=4?s=100" width="100px;" alt="HengY1Coding✨"/><br /><sub><b>HengY1Coding✨</b></sub></a><br /><a href="#financial-HengY1Cola" title="Financial">💵</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://www.stackscale.com/"><img src="https://avatars.githubusercontent.com/u/195768?v=4?s=100" width="100px;" alt="David Carrero"/><br /><sub><b>David Carrero</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=dcarrero" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/zhoro"><img src="https://avatars.githubusercontent.com/u/1105687?v=4?s=100" width="100px;" alt="Andrii Zhovtiak"/><br /><sub><b>Andrii Zhovtiak</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=zhoro" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/JohnMasoner"><img src="https://avatars.githubusercontent.com/u/42313377?v=4?s=100" width="100px;" alt="Mason Ma"/><br /><sub><b>Mason Ma</b></sub></a><br /><a href="#financial-JohnMasoner" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ntimo"><img src="https://avatars.githubusercontent.com/u/6145026?v=4?s=100" width="100px;" alt="Timo"/><br /><sub><b>Timo</b></sub></a><br /><a href="#financial-ntimo" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/evinwatson/"><img src="https://avatars.githubusercontent.com/u/24227251?v=4?s=100" width="100px;" alt="Evin Watson"/><br /><sub><b>Evin Watson</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=EvinRWatson" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://t.me/hendrjl"><img src="https://avatars.githubusercontent.com/u/15981200?v=4?s=100" width="100px;" alt="Hendra Juli"/><br /><sub><b>Hendra Juli</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=deulizealand" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/wkricowski"><img src="https://avatars.githubusercontent.com/u/36803521?v=4?s=100" width="100px;" alt="Wellinton Kricowski"/><br /><sub><b>Wellinton Kricowski</b></sub></a><br /><a href="#financial-wkricowski" title="Financial">💵</a> <a href="https://github.com/Eugeny/tabby/commits?author=wkricowski" title="Documentation">📖</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/almzau"><img src="https://avatars.githubusercontent.com/u/29115846?v=4?s=100" width="100px;" alt="Allan"/><br /><sub><b>Allan</b></sub></a><br /><a href="#design-almzau" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://oidamo.de"><img src="https://avatars.githubusercontent.com/u/17959794?v=4?s=100" width="100px;" alt="Benjamin Brandmeier"/><br /><sub><b>Benjamin Brandmeier</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=BenjaminBrandmeier" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/patric1025"><img src="https://avatars.githubusercontent.com/u/65654040?v=4?s=100" width="100px;" alt="patric1025"/><br /><sub><b>patric1025</b></sub></a><br /><a href="#translation-patric1025" title="Translation">🌍</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/hermitpopcorn"><img src="https://avatars.githubusercontent.com/u/16042129?v=4?s=100" width="100px;" alt="hermitpopcorn"/><br /><sub><b>hermitpopcorn</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=hermitpopcorn" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://joshuatz.com/"><img src="https://avatars.githubusercontent.com/u/17817563?v=4?s=100" width="100px;" alt="Joshua Tzucker"/><br /><sub><b>Joshua Tzucker</b></sub></a><br /><a href="#financial-joshuatz" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/luxifr"><img src="https://avatars.githubusercontent.com/u/665715?v=4?s=100" width="100px;" alt="luxifr"/><br /><sub><b>luxifr</b></sub></a><br /><a href="#financial-luxifr" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ukulanne"><img src="https://avatars.githubusercontent.com/u/28586666?v=4?s=100" width="100px;" alt="Anne Summers"/><br /><sub><b>Anne Summers</b></sub></a><br /><a href="#financial-ukulanne" title="Financial">💵</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Clem-Fern"><img src="https://avatars.githubusercontent.com/u/20025949?v=4?s=100" width="100px;" alt="Clem"/><br /><sub><b>Clem</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=Clem-Fern" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/elizabeth-dev"><img src="https://avatars.githubusercontent.com/u/13015727?v=4?s=100" width="100px;" alt="Elizabeth Martín Campos"/><br /><sub><b>Elizabeth Martín Campos</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=elizabeth-dev" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/siccous"><img src="https://avatars.githubusercontent.com/u/7812885?v=4?s=100" width="100px;" alt="Tomáš Hruška"/><br /><sub><b>Tomáš Hruška</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=siccous" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/karaketir16"><img src="https://avatars.githubusercontent.com/u/27349806?v=4?s=100" width="100px;" alt="Osman Karaketir"/><br /><sub><b>Osman Karaketir</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=karaketir16" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.gnomegarden.io/"><img src="https://avatars.githubusercontent.com/u/33667144?v=4?s=100" width="100px;" alt="Crypto Gnome"/><br /><sub><b>Crypto Gnome</b></sub></a><br /><a href="#financial-CryptoGnome" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/rbukovansky"><img src="https://avatars.githubusercontent.com/u/1004491?v=4?s=100" width="100px;" alt="Richard Bukovansky"/><br /><sub><b>Richard Bukovansky</b></sub></a><br /><a href="#financial-rbukovansky" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/pseudocc"><img src="https://avatars.githubusercontent.com/u/85104110?v=4?s=100" width="100px;" alt="catlas"/><br /><sub><b>catlas</b></sub></a><br /><a href="#financial-pseudocc" title="Financial">💵</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="http://kapocsi.ca"><img src="https://avatars.githubusercontent.com/u/84490604?v=4?s=100" width="100px;" alt="Thomas Kapocsi"/><br /><sub><b>Thomas Kapocsi</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=Kapocsi" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://dylhack.dev/"><img src="https://avatars.githubusercontent.com/u/27179786?v=4?s=100" width="100px;" alt="Dylan Hackworth"/><br /><sub><b>Dylan Hackworth</b></sub></a><br /><a href="#financial-dylhack" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/echo304"><img src="https://avatars.githubusercontent.com/u/16456651?v=4?s=100" width="100px;" alt="Sangboak Lee"/><br /><sub><b>Sangboak Lee</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=echo304" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/qyecst"><img src="https://avatars.githubusercontent.com/u/13901864?v=4?s=100" width="100px;" alt="qyecst"/><br /><sub><b>qyecst</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=qyecst" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/DehanLUO"><img src="https://avatars.githubusercontent.com/u/53093688?v=4?s=100" width="100px;" alt="Han"/><br /><sub><b>Han</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=DehanLUO" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/wljince007"><img src="https://avatars.githubusercontent.com/u/88243938?v=4?s=100" width="100px;" alt="wljince007"/><br /><sub><b>wljince007</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=wljince007" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/FeroTheFox"><img src="https://avatars.githubusercontent.com/u/52982404?v=4?s=100" width="100px;" alt="fero"/><br /><sub><b>fero</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=FeroTheFox" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://siebsie23.nl/"><img src="https://avatars.githubusercontent.com/u/25083973?v=4?s=100" width="100px;" alt="Sibren"/><br /><sub><b>Sibren</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=siebsie23" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.nathaniel-walser.com"><img src="https://avatars.githubusercontent.com/u/33339996?v=4?s=100" width="100px;" alt="Nathaniel Walser"/><br /><sub><b>Nathaniel Walser</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=nwalser" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/aaronhuggins"><img src="https://avatars.githubusercontent.com/u/16567111?v=4?s=100" width="100px;" alt="Aaron Huggins"/><br /><sub><b>Aaron Huggins</b></sub></a><br /><a href="#design-aaronhuggins" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://zkxdex.github.io/"><img src="https://avatars.githubusercontent.com/u/66271780?v=4?s=100" width="100px;" alt="KDex"/><br /><sub><b>KDex</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=zKXDEX" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/kimbob13"><img src="https://avatars.githubusercontent.com/u/26755098?v=4?s=100" width="100px;" alt="ChangHwan Kim"/><br /><sub><b>ChangHwan Kim</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=kimbob13" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ashneilson"><img src="https://avatars.githubusercontent.com/u/35913512?v=4?s=100" width="100px;" alt="Ash Neilson"/><br /><sub><b>Ash Neilson</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=ashneilson" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/cfs4819"><img src="https://avatars.githubusercontent.com/u/53071761?v=4?s=100" width="100px;" alt="Chen Fansong"/><br /><sub><b>Chen Fansong</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=cfs4819" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://5k.work/"><img src="https://avatars.githubusercontent.com/u/82694310?v=4?s=100" width="100px;" alt="Mxmilu"/><br /><sub><b>Mxmilu</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=Mxmilu666" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://cbuff.dev"><img src="https://avatars.githubusercontent.com/u/29805363?v=4?s=100" width="100px;" alt="Charles Buffington"/><br /><sub><b>Charles Buffington</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=C41M50N" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/GeminiLn"><img src="https://avatars.githubusercontent.com/u/12425057?v=4?s=100" width="100px;" alt="Yu Qin"/><br /><sub><b>Yu Qin</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=GeminiLn" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/fireblue"><img src="https://avatars.githubusercontent.com/u/1034929?v=4?s=100" width="100px;" alt="fireblue"/><br /><sub><b>fireblue</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=fireblue" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/marko1616"><img src="https://avatars.githubusercontent.com/u/45327989?v=4?s=100" width="100px;" alt="marko1616"/><br /><sub><b>marko1616</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=marko1616" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.selfhosted.sg/"><img src="https://avatars.githubusercontent.com/u/128927132?v=4?s=100" width="100px;" alt="SelfHosted"/><br /><sub><b>SelfHosted</b></sub></a><br /><a href="#financial-SelfHosted-Club" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://hiroga.hatenablog.com/"><img src="https://avatars.githubusercontent.com/u/13391129?v=4?s=100" width="100px;" alt="Hiroaki Ogasawara"/><br /><sub><b>Hiroaki Ogasawara</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=xhiroga" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/geodic"><img src="https://avatars.githubusercontent.com/u/64704703?v=4?s=100" width="100px;" alt="geodic"/><br /><sub><b>geodic</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=geodic" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://p.foundation/"><img src="https://avatars.githubusercontent.com/u/80860929?v=4?s=100" width="100px;" alt="P Foundation"/><br /><sub><b>P Foundation</b></sub></a><br /><a href="#financial-pfoundation" title="Financial">💵</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/et304383"><img src="https://avatars.githubusercontent.com/u/2693414?v=4?s=100" width="100px;" alt="et304383"/><br /><sub><b>et304383</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=et304383" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ajkrj"><img src="https://avatars.githubusercontent.com/u/210226755?v=4?s=100" width="100px;" alt="ajkrj"/><br /><sub><b>ajkrj</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=ajkrj" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/leoberbert/"><img src="https://avatars.githubusercontent.com/u/16724862?v=4?s=100" width="100px;" alt="Leonardo Berbert"/><br /><sub><b>Leonardo Berbert</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=leoberbert" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ToastyTheBot"><img src="https://avatars.githubusercontent.com/u/270965193?v=4?s=100" width="100px;" alt="ToastyTheBot"/><br /><sub><b>ToastyTheBot</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=ToastyTheBot" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/astex"><img src="https://avatars.githubusercontent.com/u/2158805?v=4?s=100" width="100px;" alt="Phil Condreay"/><br /><sub><b>Phil Condreay</b></sub></a><br /><a href="https://github.com/Eugeny/tabby/commits?author=astex" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

이 프로젝트는 [모든 기여자](https://github.com/all-contributors/all-contributors)의 규격을 따릅니다. 어떠한 종류의 기여도 모두 환영합니다!

<img src="https://ga-beacon.appspot.com/UA-3278102-18/github/readme" width="1"/>
