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

* A V220 터미널 + 다양한 확장
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

* [clickable-links](https://github.com/Eugeny/tabby-clickable-links) - m터미널의 경로 및 URL을 클릭 가능하게
* [docker](https://github.com/Eugeny/tabby-docker) - Docker 컨테이너에 연결
* [title-control](https://github.com/kbjr/terminus-title-control) - 접두사, 접미사 및/또는 문자열 제거를 제공하여 터미널 탭의 제목을 수정
* [quick-cmds](https://github.com/Domain/terminus-quick-cmds) - 하나 또는 모든 터미널 탭에 신속한 명령 전송
* [save-output](https://github.com/Eugeny/tabby-save-output) - 터미널 출력을 파일에 기록
* [sync-config](https://github.com/starxg/terminus-sync-config) - 구성을 Gist 또는 Gitee에 동기화
* [clippy](https://github.com/Eugeny/tabby-clippy) - 항상 당신을 귀찮게 하는 예제 플러그인
* [workspace-manager](https://github.com/composer404/tabby-workspace-manager) - 주어진 구성을 기반으로 사용자 정의 작업 공간 프로필을 생성할 수 있습니다
* [search-in-browser](https://github.com/composer404/tabby-search-in-browser) - Tabby의 탭에서 선택한 텍스트로 기본 시스템 브라우저를 엽니다

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

여기있는 멋진 사람들에게 진심으로 감사합니다. ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

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
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

이 프로젝트는 [모든 기여자](https://github.com/all-contributors/all-contributors)의 규격을 따릅니다. 어떠한 종류의 기여도 모두 환영합니다!

<img src="https://ga-beacon.appspot.com/UA-3278102-18/github/readme" width="1"/>
