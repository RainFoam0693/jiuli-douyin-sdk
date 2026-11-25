const CHAT_URL = 'https://www.douyin.com/chat'

export class DouyinChat {
  #page
  #accountSelector
  #pickerSelector
  #timeout
  #receiptTimeout
  #queue = Promise.resolve()
  #ready = false

  constructor({ page, accountSelector, pickerSelector, timeout = 10_000, receiptTimeout = Math.max(timeout, 20_000) }) {
    if (!page || !accountSelector || !pickerSelector || !Number.isFinite(timeout) || timeout <= 0 || !Number.isFinite(receiptTimeout) || receiptTimeout <= 0) {
      throw new TypeError('需要 Puppeteer Page、账号选择器、贴纸面板选择器和有效超时')
    }
    this.#page = page
    this.#accountSelector = accountSelector
    this.#pickerSelector = pickerSelector
    this.#timeout = timeout
    this.#receiptTimeout = receiptTimeout
  }

  sendSticker({ conversation, activeConversation, sticker, outgoingSticker }) {
    if (![conversation, activeConversation, sticker, outgoingSticker].every(
      selector => typeof selector === 'string' && selector.trim(),
    )) throw new TypeError('需要会话、当前会话、贴纸和发出贴纸的 CSS 选择器')

    const send = this.#queue.then(async () => {
      const page = this.#page
      let target
      try {
        target = await this.#prepare(conversation, activeConversation, sticker)
      } catch (error) {
        // 尚未点击贴纸，页面或会话加载超时可以安全重开一次。
        this.#ready = false
        if (error.name !== 'TimeoutError') throw error
        target = await this.#prepare(conversation, activeConversation, sticker)
      }
      try {
        await this.#verify(this.#accountSelector)
        await this.#verify(activeConversation)
        this.#verifyUrl()
        const before = await page.$$eval(outgoingSticker, nodes => ({
          count: nodes.length,
          ids: nodes.map(node => node.closest('[data-message-id]')?.getAttribute('data-message-id')).filter(Boolean),
        }))
        try {
          await target.click()
          const receipt = await page.waitForFunction(
            (selector, previous) => {
              const nodes = Array.from(document.querySelectorAll(selector))
              if (nodes.length > previous.count) return true
              // 虚拟列表可能在追加一条消息时移除最老的一条。
              const ids = nodes.map(node => node.closest('[data-message-id]')?.getAttribute('data-message-id'))
              const anchor = ids.indexOf(previous.ids.at(-1))
              return previous.ids.length > 0 && anchor >= 0 &&
                ids.slice(anchor + 1).some(id => id && !previous.ids.includes(id))
            },
            { timeout: this.#receiptTimeout },
            outgoingSticker,
            before,
          )
          await receipt.dispose()
          await this.#verify(this.#accountSelector)
          await this.#verify(activeConversation)
          this.#verifyUrl()
          return { confirmed: true }
        } catch (cause) {
          this.#ready = false
          throw new Error('发送结果未知，请先查看官方聊天记录再决定是否重试', { cause })
        }
      } finally {
        await target.dispose()
      }
    })
    this.#queue = send.catch(() => {})
    return send
  }

  async #prepare(conversation, activeConversation, sticker) {
    if (!this.#ready || !this.#isChatPage()) {
      this.#ready = false
      await this.#page.goto(CHAT_URL, { waitUntil: 'domcontentloaded', timeout: this.#timeout })
    }
    this.#verifyUrl()
    await this.#verify(this.#accountSelector)
    this.#ready = true
    await this.#click(conversation)
    await this.#verify(activeConversation)
    await this.#click(this.#pickerSelector)
    return this.#find(sticker)
  }

  #isChatPage() {
    const { origin, pathname } = new URL(this.#page.url())
    return origin === 'https://www.douyin.com' && /^\/chat\/?$/.test(pathname)
  }

  #verifyUrl() {
    if (!this.#isChatPage()) {
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
