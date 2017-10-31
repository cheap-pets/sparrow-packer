const { emptyDirSync } = require('fs-extra');
const { parseConfig } = require('./config');
const { packAll } = require('./pack');
const { watch } = require('./watch');

async function pack(path, clear) {
  const { outputRoot } = parseConfig(path);
  clear && emptyDirSync(outputRoot);
  await packAll();
}

async function packAndWatch(path) {
  await pack(path);
  watch();
}

module.exports = {
  pack,
  packAndWatch
}
