import assert from 'node:assert/strict'
import test from 'node:test'
import { DouyinChat } from './index.js'

const request = {
  conversation: '#target', activeConversation: '#active',
  sticker: '#spark', outgoingSticker: '#sent',
}

function setup({ ambiguous, noReceipt } = {}) {
  const clicks = []
  const page = {
    async goto() {},
    url: () => 'https://www.douyin.com/chat',
    async waitForSelector(selector) {
      return { async click() { clicks.push(selector) }, async dispose() {} }
    },
    async $$eval(selector, count) {
      return count(Array.from({ length: selector === ambiguous ? 2 : 1 }))
    },
    async waitForFunction(_predicate, _options, selector, before) {
      assert.equal(selector, '#sent')
      assert.equal(before, 1)
      if (noReceipt) throw new Error('timeout')
      return { async dispose() {} }
    },
  }
  return {
    clicks, chat: new DouyinChat({ page, accountSelector: '#account', pickerSelector: '#picker' }),
  }
}

test('clicks the target, picker and sticker in order', async () => {
  const { chat, clicks } = setup()
  assert.deepEqual(await chat.sendSticker(request), { confirmed: true })
  assert.deepEqual(clicks, ['#target', '#picker', '#spark'])
})

test('refuses to click if the target conversation is ambiguous', async () => {
  const { chat, clicks } = setup({ ambiguous: '#target' })
  await assert.rejects(chat.sendSticker(request), /唯一匹配/)
  assert.deepEqual(clicks, [])
})

test('reports an unknown result without retrying when no receipt appears', async () => {
  const { chat, clicks } = setup({ noReceipt: true })
  await assert.rejects(chat.sendSticker(request), /发送结果未知/)
  assert.equal(clicks.filter(click => click === '#spark').length, 1)
})
