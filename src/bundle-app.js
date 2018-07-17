const { existsSync, mkdirsSync, removeSync, createWriteStream } = require('fs-extra')
const { parse } = require('path')
const archiver = require('archiver')

const { info, error } = require('./logger')

function bundlePromise (inputDir, outputFile) {
  return new Promise((resolve, reject) => {
    info('[z]', 'dir:', inputDir)
    const { dir } = parse(outputFile)
    if (!existsSync(dir)) mkdirsSync(dir)
    else removeSync(outputFile)
    const output = createWriteStream(outputFile).on('close', resolve)
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
    await bundlePromise(inputDir, outputFile)
    info('...', 'output:', outputFile)
  } catch (err) {
    error('...', err.message || err)
  }
}

module.exports = bundleApp
