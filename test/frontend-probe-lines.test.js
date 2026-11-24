import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('homepage shows three IPv4 and three IPv6 probes, including a measured timeout', async () => {
  const vite = await createServer({
    configFile: false,
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true }
  })
  const originalStorage = globalThis.localStorage
  globalThis.localStorage = { getItem: () => null }
  try {
    const { useServerCardData } = await vite.ssrLoadModule('/src/frontend/composables/useServerCardData.js')
    const server = {
      ping_ct: 35, loss_ct: 0,
      ping_cu: 36, loss_cu: 0,
      ping_cm: 37, loss_cm: 0,
      ping_node_1: 70, loss_node_1: 0,
      ping_node_2: null, loss_node_2: 100,
      ping_node_3: 80, loss_node_3: 0,
      loss_node_4: false,
    }
    const sysConfig = { node_2_name: '上海联通 IPv6' }
    const card = useServerCardData({ server, sysConfig })
    const expected = ['ct', 'cu', 'cm', 'node_1', 'node_2', 'node_3']
    assert.deepEqual(card.threeNetDetails.value.map(row => row.key), expected)
    assert.deepEqual(card.pingList.value.map(row => row.key), expected)
    assert.equal(card.threeNetDetails.value[4].averageLoss, 100)
    assert.equal(card.pingList.value[4].label, sysConfig.node_2_name)

    const ipv4Only = useServerCardData({
      server: { ping_ct: 35, ping_cu: 36, ping_cm: 37, loss_bd: false }, sysConfig
    })
    assert.deepEqual(ipv4Only.threeNetDetails.value.map(row => row.key), expected.slice(0, 3))
    assert.deepEqual(ipv4Only.pingList.value.map(row => row.key), expected.slice(0, 3))

    const allReported = useServerCardData({
      server: { ...server, ping_bd: 45, loss_bd: 0, ping_node_4: 90, loss_node_4: 0 }, sysConfig
    })
    assert.equal(allReported.threeNetDetails.value.length, 6)
    assert.equal(allReported.pingList.value.length, 6)
  } finally {
    globalThis.localStorage = originalStorage
    await vite.close()
  }
})
