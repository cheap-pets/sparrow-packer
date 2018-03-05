const { parse } = require('path')
const { info, error } = require('./logger')
const { copySync, mkdirsSync, writeFileSync } = require('fs-extra')

const bundleStyles = require('./bundle-styles')
const bundleScript = require('./bundle-scripts')

async function copy (path, output) {
  info('[>]', 'static:', path)
  info('...', 'output:', output)
  copySync(path, output)
}

async function outputPage (content, output) {
  mkdirsSync(parse(output).dir)
  writeFileSync(output, content)
  info('[>]', 'page:', output)
}

async function processAsset (path, staticOutput) {
  try {
    if (staticOutput) {
      await copy(path, staticOutput)
    } else {
      const asset = this.assets[path]
      if (asset) {
        const { type, output, cssOutput, content, changed } = asset
        if (type === 'watch' || changed === false) return
        switch (type) {
          case 'page':
            await outputPage(content, output)
            break
          case 'script':
            await bundleScript(path, output, cssOutput, this.options)
            break
          case 'style':
            await bundleStyles(path, output)
            break
          case 'static':
            await copy(path, output)
            break
        }
        asset.changed = false
      }
    }
  } catch (e) {
    Object.defineProperty(e, 'stack', {
      enumerable: true
    })
    if (e.message) error('...', e.message)
    if (e.stack) error('...', e.stack)
  }
}

module.exports = processAsset
