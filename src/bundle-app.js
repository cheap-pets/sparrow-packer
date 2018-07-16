const { createWriteStream, removeSync } = require('fs-extra')
const path = require('path')
const archiver = require('archiver')

const { info, error } = require('./logger')

function bundlePromise (inputDir, outputFile) {
  return new Promise((resolve, reject) => {
    const filePath = path.resolve(__dirname, outputFile)
    info('[z]', filePath)
    removeSync(filePath)
    const output = createWriteStream(filePath).on('close', resolve)
    const zip = archiver('zip', { zlib: { level: 5 } })
    zip
      .on('error', reject)
      .pipe(output)
    zip
      .directory(inputDir, false)
      .finalize()
  })
}

async function bundleApp (inputDir, outputFile) {
  try {
    await bundlePromise()
    info('...', 'done')
  } catch (err) {
    error('...', err.message || err)
  }
}

module.exports = bundleApp
