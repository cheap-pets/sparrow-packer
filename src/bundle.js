var fs = require('fs')
const archiver = require('archiver')

function bundlePromise (inputDir, outputFile) {
  var output = fs.createWriteStream(__dirname + '/example.zip')

  const zip = archiver('zip', {
    zlib: { level: 3 }
  })
  zip.directory(inputDir, false)
  zip.finalize()
}


async function bundle (inputDir, outputFile) {
  await bundlePromise
}

module.exports = bundle
