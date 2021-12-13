[![](docs/readme.png)](https://tabby.sh)

<p align="center">
  <a href="https://github.com/Eugeny/tabby/releases/latest"><img alt="GitHub All Releases" src="https://img.shields.io/github/downloads/eugeny/tabby/total.svg?label=DOWNLOADS&logo=github&style=for-the-badge"></a> &nbsp; <a href="https://nightly.link/Eugeny/tabby/workflows/build/master"><img src="https://shields.io/badge/-Nightly%20Builds-orange?logo=hackthebox&logoColor=fff&style=for-the-badge"/></a> &nbsp; <a href="https://matrix.to/#/#tabby-general:matrix.org"><img alt="Matrix" src="https://img.shields.io/matrix/tabby-general:matrix.org?logo=matrix&style=for-the-badge&color=magenta"></a> &nbsp; <a href="https://twitter.com/eugeeeeny"><img alt="Twitter" src="https://shields.io/badge/Subscribe-News-blue?logo=twitter&style=for-the-badge&color=blue"></a>
</p>

<p align="center">
  <a href="https://ko-fi.com/J3J8KWTF">
    <img src="https://cdn.ko-fi.com/cdn/kofi3.png?v=2" width="150">
  </a>
</p>

* * *

### डाउनलोड:

-   [नवीनतम प्रकाशन](https://github.com/Eugeny/tabby/releases/latest)
-   [डेटा संग्रह स्थान](https://packagecloud.io/eugeny/tabby):[डेबियन/उबंटू-आधारित](https://packagecloud.io/eugeny/tabby/install#bash-deb),[RPM- आधारित](https://packagecloud.io/eugeny/tabby/install#bash-rpm)
-   [नवीनतम रात्रिकालीन निर्माण](https://nightly.link/Eugeny/tabby/workflows/build/master)

### यह README इसमें भी उपलब्ध है:

[अंग्रेज़ी](README.md)\|[सरलीकृत चीनी](./README.zh-CN.md)\|[परंपरागत चीनी](./README.zh-TW.md)\|[कोरियाई](./README.ko-KR.md)\|[फ्रेंच](./README.fr.md)\|[अरबी](./README.ar.md)\|[हिंदी](./README.hi.md)

* * *

[**बद गप्पी**](https://tabby.sh)(पूर्व में**अंतिम स्टेशन**) विंडोज, मैकओएस और लिनक्स के लिए एक उच्च विन्यास योग्य टर्मिनल एमुलेटर, एसएसएच और सीरियल क्लाइंट है

-   एकीकृत एसएसएच और टेलनेट क्लाइंट और कनेक्शन मैनेजर
-   एकीकृत सीरियल टर्मिनल
-   थीमिंग और रंग योजनाएं
-   पूरी तरह से विन्यास योग्य शॉर्टकट और मल्टी-कॉर्ड शॉर्टकट
-   विभाजित फलक
-   आपके टैब याद रखता है
-   पावरशेल (और पीएस कोर), डब्ल्यूएसएल, गिट-बैश, सिगविन, एमएसवाईएस2, सीएमडीडर और सीएमडी समर्थन
-   Zmodem . के माध्यम से SSH सत्रों से/में प्रत्यक्ष फ़ाइल स्थानांतरण
-   डबल-चौड़ाई वाले वर्णों सहित पूर्ण यूनिकोड समर्थन
-   तेजी से बहने वाले आउटपुट पर चोक नहीं होता है
-   टैब पूर्णता सहित विंडोज़ पर उचित शेल अनुभव (क्लिंक के माध्यम से)
-   SSH रहस्यों और कॉन्फ़िगरेशन के लिए एकीकृत एन्क्रिप्टेड कंटेनर
-   SSH, SFTP और टेलनेट क्लाइंट a . के रूप में उपलब्ध हैं[वेब अप्प](https://tabby.sh/app)(भी[स्वयं के द्वारा होस्ट](https://github.com/Eugeny/tabby-web)).

# अंतर्वस्तु<!-- omit in toc -->

-   [टैबी क्या है और क्या नहीं?](#what-tabby-is-and-isnt)
-   [टर्मिनल सुविधाएँ](#terminal-features)
-   [एसएसएच क्लाइंट](#ssh-client)
-   [सीरियल टर्मिनल](#serial-terminal)
-   [पोर्टेबल](#portable)
-   [प्लग-इन](#plugins)
-   [विषयों](#themes)
-   [योगदान](#contributing)

<a name="about"></a>

# टैबी क्या है और क्या नहीं?

-   **टैबी is**Windows के मानक टर्मिनल (conhost), PowerShell ISE, PuTTY, macOS Terminal.app और iTerm का विकल्प

-   **टैबी नहीं है**एक नया शेल या एक MinGW या Cygwin प्रतिस्थापन। न तो यह हल्का है - यदि रैम का उपयोग महत्वपूर्ण है, तो विचार करें[कोनेमु](https://conemu.github.io)या[अलक्रिट्टी](https://github.com/jwilm/alacritty)

<a name="terminal"></a>

# टर्मिनल सुविधाएँ

![](docs/readme-terminal.png)

-   एक V220 टर्मिनल + विभिन्न एक्सटेंशन
-   एकाधिक नेस्टेड विभाजन फलक
-   खिड़की के किसी भी तरफ टैब
-   ग्लोबल स्पॉन हॉटकी ("क्वैक कंसोल") के साथ वैकल्पिक डॉक करने योग्य विंडो
-   प्रगति का पता लगाना
-   प्रक्रिया पूर्ण होने पर अधिसूचना
-   ब्रैकेट वाला पेस्ट, मल्टीलाइन पेस्ट चेतावनियां
-   फ़ॉन्ट संयुक्ताक्षर
-   कस्टम शेल प्रोफाइल
-   वैकल्पिक RMB पेस्ट और कॉपी-ऑन सेलेक्ट (PuTTY स्टाइल)

<a name="ssh"></a>

# एसएसएच क्लाइंट

![](docs/readme-ssh.png)

-   कनेक्शन प्रबंधक के साथ SSH2 क्लाइंट
-   X11 और पोर्ट फ़ॉरवर्डिंग
-   स्वचालित कूद मेजबान प्रबंधन
-   एजेंट अग्रेषण (पेजेंट और विंडोज नेटिव ओपनएसएसएच एजेंट सहित)
-   लॉगिन स्क्रिप्ट

<a name="serial"></a>

# सीरियल टर्मिनल

-   सहेजे गए कनेक्शन
-   रीडलाइन इनपुट सपोर्ट
-   वैकल्पिक हेक्स बाइट-बाय-बाइट इनपुट और हेक्सडंप आउटपुट
-   न्यूलाइन रूपांतरण
-   स्वचालित पुन: कनेक्शन

<a name="portable"></a>

# पोर्टेबल

टैब्बी विंडोज़ पर पोर्टेबल ऐप के रूप में चलेगा, अगर आप एक`data`उसी स्थान पर फ़ोल्डर जहां`Tabby.exe`रहता है।

<a name="plugins"></a>

# प्लग-इन

प्लगइन्स और थीम को टैबी के अंदर सेटिंग व्यू से सीधे इंस्टॉल किया जा सकता है।

-   [क्लिक करने योग्य लिंक](https://github.com/Eugeny/tabby-clickable-links)- टर्मिनल में पथ और URL को क्लिक करने योग्य बनाता है
-   [डाक में काम करनेवाला मज़दूर](https://github.com/Eugeny/tabby-docker)- डॉकर कंटेनरों से कनेक्ट करें
-   [शीर्षक नियंत्रण](https://github.com/kbjr/terminus-title-control)- एक उपसर्ग, प्रत्यय, और/या हटाए जाने वाले तार प्रदान करके टर्मिनल टैब के शीर्षक को संशोधित करने की अनुमति देता है
-   [त्वरित आदेश](https://github.com/Domain/terminus-quick-cmds)- जल्दी से एक या सभी टर्मिनल टैब पर कमांड भेजें
-   [सेव-आउटपुट](https://github.com/Eugeny/tabby-save-output)- एक फाइल में टर्मिनल आउटपुट रिकॉर्ड करें
-   [सिंक-कॉन्फ़िगरेशन](https://github.com/starxg/terminus-sync-config)- कॉन्फ़िगरेशन को Gist या Gitee में सिंक करें
-   [क्लिपी](https://github.com/Eugeny/tabby-clippy)- एक उदाहरण प्लगइन जो आपको हर समय परेशान करता है
-   [कार्यक्षेत्र प्रबंधक](https://github.com/composer404/tabby-workspace-manager)- दिए गए कॉन्फ़िगरेशन के आधार पर कस्टम कार्यक्षेत्र प्रोफ़ाइल बनाने की अनुमति देता है
-   [ब्राउज़र में खोजें](https://github.com/composer404/tabby-search-in-browser)- टैबी के टैब से चुने गए टेक्स्ट के साथ डिफ़ॉल्ट सिस्टम ब्राउज़र खोलता है

<a name="themes"></a>

# विषयों

-   [प्रचार](https://github.com/Eugeny/tabby-theme-hype)- एक हाइपर प्रेरित विषय
-   [ढील](https://github.com/Relaxed-Theme/relaxed-terminal-themes#terminus)- Tabby . के लिए आराम से थीम
-   [ग्रवबॉक्स](https://github.com/porkloin/terminus-theme-gruvbox)
-   [विंडोज 10](https://www.npmjs.com/package/terminus-theme-windows10)
-   [पक्षी](https://github.com/yxuko/terminus-altair)

# प्रायोजकों<!-- omit in toc -->

[![](https://assets-production.packagecloud.io/assets/packagecloud-logo-light-scaled-26ce8e96060fddf74afbd4445e63ba35590d4aaa56edc98495bb390ef3cae0ae.png)](https://packagecloud.io)

[**पैकेजक्लाउड**](https://packagecloud.io)मुफ्त डेबियन/आरपीएम रिपोजिटरी होस्टिंग प्रदान की है

<a name="contributing"></a>

# योगदान

पुल अनुरोध और प्लगइन्स का स्वागत है!

देखो[हैकिंग.मद](https://github.com/Eugeny/tabby/blob/master/HACKING.md)तथा[दस्तावेज़ दें](https://docs.tabby.sh/)परियोजना कैसे निर्धारित की जाती है, और एक बहुत ही संक्षिप्त प्लगइन विकास ट्यूटोरियल की जानकारी के लिए।

* * *

<a name="contributors"></a>

इन अद्भुत लोगों को धन्यवाद ([इमोजी कुंजी](https://allcontributors.org/docs/en/emoji-key)):

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
  </tr>
</table>

<!-- markdownlint-restore -->

<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

यह परियोजना इस प्रकार है[सभी योगदानकर्ता](https://github.com/all-contributors/all-contributors)विशिष्टता। किसी भी प्रकार के योगदान का स्वागत है!

<img src="https://ga-beacon.appspot.com/UA-3278102-18/github/readme" width="1"/>
