const { emptyDirSync, existsSync, statSync, mkdirsSync } = require('fs-extra')
const { isAbsolute } = require('path')

const addToAssets = require('./add-to-assets')
const processAsset = require('./process-asset')
const watchSource = require('./watch-source')
const { info } = require('./logger')

function checkExist (path, name, mkdir) {
  if (!isAbsolute(path)) {
    throw new Error(name + ': ' + path + '" should be absolute path.')
  }
  const exist = existsSync(path)
  if (!exist && !mkdir) {
    throw new Error(name + ': ' + path + '" does not exist.')
  } else {
    if (!exist && mkdir) {
      mkdirsSync(path)
    } else {
      if (!statSync(path).isDirectory()) {
        throw new Error(name + ': ' + path + '" is not a folder.')
      }
    }
  }
}

function cleanDir (path) {
  info('[c]', 'clean:', path)
  emptyDirSync(path)
}

class Packer {
  constructor (options) {
    const defaultOptions = {
      pageExt: ['html', 'htm'],
      scriptExt: ['js'],
      styleExt: ['css', 'pcss']
    }
    this.options = Object.assign(defaultOptions, options)
    checkExist(this.options.srcRoot, 'options.srcRoot')
    checkExist(this.options.distRoot, 'options.distRoot', true)
    this.revision = options.revision || (+new Date()).toString(36)
    this.assets = {}
    this.watchTasks = []
  }
  add (input, output) {
    return addToAssets.call(this, input, output)
  }
  addStatic (input, output) {
    return addToAssets.call(this, input, output, true)
  }
  addAll () {
    return addToAssets.call(this)
  }
  async run () {
    info('[=]', 'start packing ...')
    const { clean, watch, distRoot } = this.options
    clean !== false && cleanDir(distRoot)
    for (const key in this.assets) {
      await processAsset.call(this, key)
    }
    watch && (this.watcher = watchSource.call(this))
  }
  watchOff () {
    this.watcher && this.watcher.close()
  }
}

module.exports = Packer
