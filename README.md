[![](docs/readme.png)](https://tabby.sh)

----

[**Tabby**](https://tabby.sh) (前身是 **Terminus**) 是一个可高度配置的终端模拟器和 SSH 或串口客户端，支持 Windows，macOS 和 Linux

* 集成 SSH 客户端和连接管理器
* 集成串行终端
* 定制主题和配色方案
* 完全可配置的快捷键和多键快捷键
* 分体式窗格
* 自动保存标签页
* 支持 PowerShell（和 PS Core）、WSL、Git-Bash、Cygwin、MSYS2、Cmder 和 CMD
* 在 SSH 会话中通过 Zmodem 进行直接文件传输
* 完整的 Unicode 支持，包括双角字符
* 不会因快速的输出而卡住
* Windows 上舒适的 shell 体验，包括 tab 自动补全（通过 Clink）
* 为 SSH secrets 和设置集成了加密容器
* SSH 和 SFTP 客户端可用作 [Web 应用](https://tabby.sh/app)（也可[托管](https://github.com/Eugeny/tabby-web)）

# 目录

- [Tabby是什么](#tabby是什么)
- [终端特性](#终端特性)
- [SSH 客户端](#ssh-客户端)
- [串行终端](#串行终端)
- [便携式应用](#便携式应用)
- [插件](#插件)
- [主题](#主题)
- [贡献](#贡献)

# Tabby是什么

* **Tabby 是** Windows 标准终端 (conhost)、PowerShell ISE、PuTTY、macOS Terminal.app 和 iTerm 的替代品

* **Tabby 不是**一个全新的 shell，也不是 MinGW 或 Cygwin 的替代品。它也不是轻量级的 - 如果你对内存的占用很敏感，请考虑 [Conemu](https://conemu.github.io) 或 [Alacritty](https://github.com/jwilm/alacritty)

# 终端特性

![](docs/readme-terminal.png)

* 一个 VT220 终端 + 各种插件
* 多个嵌套的拆分窗格
* 可以将标签页设置在窗口的任意一侧
* 带有全局生成热键的可选可停靠窗口（"Quake console"）
* 进度检测
* 流程完成通知
* 带括号的粘贴，多行粘贴提示
* 连体字
* 自定义 shell 配置文件
* 可选的 RMB 粘贴和复制选择（PuTTY 风格）

# SSH 客户端

![](docs/readme-ssh.png)

* 带有连接管理器的 SSH2 客户端
* X11和端口转发
* 自动跳转主机管理
* 代理转发（包括 Pageant 和 Windows 原生 OpenSSH 代理）
* 登录脚本

# 串行终端

* 保存连接
* 逐行读取的输入支持
* 可选的十六进制逐字节输入和十六进制转储输出
* 换行转换
* 自动重连

# 便携式应用

如果在 Tabby.exe 所在的目录创建一个名为`data`文件夹，Tabby 将可以在 Windows 上作为便携式的应用程序运行。

# 插件

插件和主题可以直接在 Tabby 设置中安装。

* [clickable-links](https://github.com/Eugeny/tabby-clickable-links) - 使终端中的路径和 URL 可点击
* [docker](https://github.com/Eugeny/tabby-docker) - 连接 Docker 容器
* [title-control](https://github.com/kbjr/terminus-title-control) - 允许通过提供要删除的前缀、后缀和/或字符串来修改标签页的标题
* [quick-cmds](https://github.com/Domain/terminus-quick-cmds) - 快速向一个或所有标签页发送命令
* [save-output](https://github.com/Eugeny/tabby-save-output) - 将终端输出记录到文件中
* [sync-config](https://github.com/starxg/terminus-sync-config) - 将配置同步到 Gist 或 Gitee
* [clippy](https://github.com/Eugeny/tabby-clippy) - 一个可以一直烦你的示例插件
* [workspace-manager](https://github.com/composer404/tabby-workspace-manager) - 允许根据给定的配置创建自定义工作区配置文件
* [search-in-browser](https://github.com/composer404/tabby-search-in-browser) - 从 Tabby 标签页带有选中的文本来打开系统默认浏览器
* [sftp-tab](https://github.com/wljince007/tabby-sftp-tab) - 为ssh连接打开类似SecureCRT的sftp标签页
* [web-auth-handler](https://github.com/Jazzmoon/tabby-web-auth-handler) - 应用内网页认证弹出窗口（主要为warpgate浏览器认证而建）
* [mcp-server](https://github.com/thuanpham582002/tabby-mcp-server) - 为 Tabby 提供强大的模型上下文协议服务器集成

# 主题

* [hype](https://github.com/Eugeny/tabby-theme-hype) - 受 Hyper 启发的主题
* [relaxed](https://github.com/Relaxed-Theme/relaxed-terminal-themes#terminus) - 为 Tabby 打造的 Relaxed 主题
* [gruvbox](https://github.com/porkloin/terminus-theme-gruvbox)
* [windows10](https://www.npmjs.com/package/terminus-theme-windows10)
* [altair](https://github.com/yxuko/terminus-altair)

# 贡献

欢迎提交 PR 和插件！

请参阅 [HACKING.md](https://github.com/Eugeny/tabby/blob/master/HACKING.md) 和 [API 文档](https://docs.tabby.sh/) 以获取有关项目布局的信息以及非常简短的插件开发教程。
