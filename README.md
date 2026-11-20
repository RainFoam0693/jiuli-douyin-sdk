# JiuLi 抖音聊天 SDK

独立 Node.js 库，通过调用方提供的 Puppeteer Page 在抖音官方聊天网页发送贴纸。用于 JiuLi 时，由 [DouYin-Plugin](https://github.com/RainFoam0693/DouYin-Plugin) 安装此依赖并调用。

## 安装

需要 Node.js 22 或以上版本。独立项目可从公开 GitHub 仓库安装，无需登录或 SSH 密钥。

```sh
npm install https://codeload.github.com/RainFoam0693/jiuli-douyin-sdk/tar.gz/77d7f7f11afcbe3852e661b815d7d7b97ca20fb8
```

## 发送贴纸

首次运行时，用抖音 App 在专用浏览器配置目录里扫码登录。浏览器配置目录应放在仓库外。

```js
import { DouyinChat } from '@rainfoam0693/jiuli-douyin-sdk'

const chat = new DouyinChat({ page, accountSelector, pickerSelector })
await chat.sendSticker({ conversation, activeConversation, sticker, outgoingSticker })
```

选择器取自登录后的官方网页，前四类用于匹配当前账号、唯一的会话项、已打开的目标会话和贴纸控件。另需提供贴纸面板按钮，以及仅匹配当前会话中同款已发出贴纸的 `outgoingSticker`。请用稳定的账号和会话标识配置选择器，避免使用可能重名的昵称。每个浏览器页面只由一个 SDK 实例控制。发送结果未知时应先核对聊天记录。

`sendSticker()` 在网页出现新的匹配出站贴纸后返回 `{ confirmed: true }`。先用单个测试会话核对本机浏览器的选择器。网页必须提供所需贴纸。可用 `npm test` 运行离线测试。
