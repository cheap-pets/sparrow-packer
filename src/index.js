const { emptyDirSync } = require('fs-extra')
const { parseConfig } = require('./config')
const { packAll } = require('./pack')
const { watch } = require('./watch')
const zc = require('./zero-config-pack')

async function pack (path, clear) {
  const { outputRoot } = parseConfig(path)
  clear && emptyDirSync(outputRoot)
  await packAll()
}

async function packAndWatch (path, clear) {
  await pack(path, clear)
  watch()
}

module.exports = {
  pack,
  packAndWatch,
  zcPack: zc.pack,
  zcPackAndWatch: zc.packAndWatch
}
