import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('extension manifest is a Chrome MV3 popup', async () => {
  const manifest = JSON.parse(await readFile(new URL('../extension/manifest.json', import.meta.url)))
  assert.equal(manifest.manifest_version, 3)
  assert.equal(manifest.action.default_popup, 'popup.html')
  assert.equal(manifest.permissions.includes('tabs'), true)
})

test('popup keeps data in the webapp instead of browser storage', async () => {
  const popup = await readFile(new URL('../extension/popup.js', import.meta.url), 'utf8')
  assert.match(popup, /self-reminder\.vercel\.app/)
  assert.doesNotMatch(popup, /localStorage|chrome\.storage/)
})
