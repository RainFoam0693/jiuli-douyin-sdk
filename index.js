const CHAT_URL = 'https://www.douyin.com/chat'

export class DouyinChat {
  #page
  #accountSelector
  #pickerSelector
  #timeout
  #queue = Promise.resolve()

  constructor({ page, accountSelector, pickerSelector, timeout = 10_000 }) {
    if (!page || !accountSelector || !pickerSelector || !Number.isFinite(timeout) || timeout <= 0) {
      throw new TypeError('需要 Puppeteer Page、账号选择器、贴纸面板选择器和有效超时')
    }
    this.#page = page
    this.#accountSelector = accountSelector
    this.#pickerSelector = pickerSelector
    this.#timeout = timeout
  }

  sendSticker({ conversation, activeConversation, sticker, outgoingSticker }) {
    if (![conversation, activeConversation, sticker, outgoingSticker].every(
      selector => typeof selector === 'string' && selector.trim(),
    )) throw new TypeError('需要会话、当前会话、贴纸和发出贴纸的 CSS 选择器')

    const send = this.#queue.then(async () => {
      const page = this.#page
      await page.goto(CHAT_URL, { waitUntil: 'domcontentloaded', timeout: this.#timeout })
      this.#verifyUrl()
      await this.#verify(this.#accountSelector)
      await this.#click(conversation)
      await this.#verify(activeConversation)
      await this.#click(this.#pickerSelector)
      const target = await this.#find(sticker)
      try {
        await this.#verify(this.#accountSelector)
        await this.#verify(activeConversation)
        this.#verifyUrl()
        const before = await page.$$eval(outgoingSticker, nodes => nodes.length)
        try {
          await target.click()
          const receipt = await page.waitForFunction(
            (selector, count) => document.querySelectorAll(selector).length > count,
            { timeout: this.#timeout },
            outgoingSticker,
            before,
          )
          await receipt.dispose()
          await this.#verify(activeConversation)
          this.#verifyUrl()
          return { confirmed: true }
        } catch (cause) {
          throw new Error('发送结果未知，请先查看官方聊天记录再决定是否重试', { cause })
        }
      } finally {
        await target.dispose()
      }
    })
    this.#queue = send.catch(() => {})
    return send
  }

  #verifyUrl() {
    const { origin, pathname } = new URL(this.#page.url())
    if (origin !== 'https://www.douyin.com' || !/^\/chat\/?$/.test(pathname)) {
      throw new Error('当前页面不是抖音官方聊天页')
    }
  }

  async #find(selector) {
    const page = this.#page
    const handle = await page.waitForSelector(selector, { visible: true, timeout: this.#timeout })
    if (await page.$$eval(selector, nodes => nodes.length) !== 1) {
      await handle.dispose()
      throw new Error('页面选择器必须唯一匹配')
    }
    return handle
  }

  async #verify(selector) {
    const handle = await this.#find(selector)
    await handle.dispose()
  }

  async #click(selector) {
    const handle = await this.#find(selector)
    try {
      this.#verifyUrl()
      await handle.click()
    } finally {
      await handle.dispose()
    }
  }
}
