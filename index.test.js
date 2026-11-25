import assert from 'node:assert/strict'
import test from 'node:test'
import { DouyinChat } from './index.js'

const request = {
  conversation: '#target', activeConversation: '#active',
  sticker: '#spark', outgoingSticker: '#sent',
}

function setup({ ambiguous, noReceipt, timeoutOnce, rotate } = {}) {
  const clicks = []
  const visits = []
  const page = {
    async goto(url) { visits.push(url) },
    url: () => 'https://www.douyin.com/chat',
    async waitForSelector(selector) {
      if (selector === timeoutOnce) {
        timeoutOnce = undefined
        throw Object.assign(new Error('selector timeout'), { name: 'TimeoutError' })
      }
      return { async click() { clicks.push(selector) }, async dispose() {} }
    },
    async $$eval(selector, count) {
      const ids = selector === '#sent' && rotate ? ['old', 'anchor'] : ['anchor']
      const nodes = ids.map(id => ({ closest: () => ({ getAttribute: () => id }) }))
      return count(selector === ambiguous ? [...nodes, ...nodes] : nodes)
    },
    async waitForFunction(_predicate, options, selector, before) {
      assert.equal(options.timeout, 20_000)
      assert.equal(selector, '#sent')
      const ids = ['anchor', 'new']
      const original = globalThis.document
      try {
        globalThis.document = { querySelectorAll: () => ids.map(id => ({ closest: () => ({ getAttribute: () => id }) })) }
        assert.equal(_predicate(selector, before), true)
      } finally {
        if (original === undefined) delete globalThis.document
        else globalThis.document = original
      }
      if (noReceipt) throw new Error('timeout')
      return { async dispose() {} }
    },
  }
  return {
    visits, clicks, chat: new DouyinChat({ page, accountSelector: '#account', pickerSelector: '#picker' }),
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


test('reopens chat once after a pre-send selector timeout', async () => {
  const { chat, clicks } = setup({ timeoutOnce: '#target' })
  assert.deepEqual(await chat.sendSticker(request), { confirmed: true })
  assert.deepEqual(clicks, ['#target', '#picker', '#spark'])
})


test('reuses one chat page for a batch and switches conversations in order', async () => {
  const { chat, clicks, visits } = setup()
  await Promise.all([
    chat.sendSticker(request),
    chat.sendSticker({ ...request, conversation: '#other' }),
  ])
  assert.equal(visits.length, 1)
  assert.deepEqual(clicks, ['#target', '#picker', '#spark', '#other', '#picker', '#spark'])
})

test('recognizes a new outgoing sticker when the rendered count stays fixed', async () => {
  const { chat } = setup({ rotate: true })
  assert.deepEqual(await chat.sendSticker(request), { confirmed: true })
})
