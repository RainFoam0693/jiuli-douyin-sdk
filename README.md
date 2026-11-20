# JiuLi 抖音聊天 SDK

独立 Node.js 库，通过调用方提供的 Puppeteer Page 操作抖音官方聊天网页。首次运行时，用抖音 App 在专用浏览器配置目录里正常扫码登录。浏览器配置目录应放在仓库外。

```js
import { DouyinChat } from '@rainfoam0693/jiuli-douyin-sdk'

const chat = new DouyinChat({ page, accountSelector, pickerSelector })
await chat.sendSticker({ conversation, activeConversation, sticker, outgoingSticker })
```

选择器取自登录后的官方网页，前四类用于匹配当前账号、唯一的会话项、已打开的目标会话和贴纸控件。另需提供贴纸面板按钮，以及仅匹配当前会话中同款已发出贴纸的 `outgoingSticker`。请用稳定的账号和会话标识配置选择器，避免使用可能重名的昵称。每个浏览器页面只由一个 SDK 实例控制。发送结果未知时应先核对聊天记录。

当前版本提供贴纸发送接口，真实登录后的页面选择器和出站显示需要用测试会话验收。网页必须提供所需贴纸才可使用。可用 `npm test` 运行离线测试。
