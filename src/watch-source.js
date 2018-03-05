const chokidar = require('chokidar')
const inside = require('path-is-inside')
const { parse, relative, resolve } = require('path')

const { info } = require('./logger')
const addToAssets = require('./add-to-assets')
const processAsset = require('./process-asset')

async function runTask () {
  if (this.watchTaskRunning || !this.watchTasks.length) {
    if (!this.watchTasks.length) {
      info('[@]', 'waiting ...', 'press ctrl + c to exit.')
    }
    return
  }
  this.watchTaskRunning = true
  const { path, output } = this.watchTasks.shift()
  await processAsset.call(this, path, output)
  this.watchTaskRunning = false
  await runTask.call(this)
}

function addTask (path, output) {
  let taskExist
  for (let item of this.watchTasks) {
    if (item.path === path) {
      taskExist = true
      break
    }
  }
  if (!taskExist) this.watchTasks.push({ path, output })
}

function addPageTask (assets, path) {
  addToAssets.call(this, path)
  addTask.call(this, path)
  for (let key in assets) {
    const { type, associations } = assets[key]
    if (type !== 'watch' && associations && associations.indexOf(path) >= 0) {
      addTask.call(this, key)
    }
  }
}

async function addWatchTasks (path, event) {
  const assets = this.assets
  let matched
  for (const key in assets) {
    const { output, type, associations } = assets[key]
    if (['page', 'static', 'watch'].indexOf(type) < 0 || !inside(path, key)) continue
    matched = true
    switch (type) {
      case 'page':
        if (event !== 'unlink') {
          addPageTask.call(this, assets, path)
        }
        break
      case 'static':
        if (event !== 'unlink') {
          const staticOutput = resolve(output, relative(key, path))
          addTask.call(this, path, staticOutput)
        }
        break
      case 'watch':
        for (let i = 0, len = associations.length; i < len; i++) {
          const aKey = associations[i]
          const asset = assets[aKey]
          if (asset) {
            asset.changed = true
            addTask.call(this, aKey)
          }
        }
        break
    }
  }
  const ext = parse(path).ext.substr(1)
  if (!matched && event === 'add' && this.options.pageExt.indexOf(ext) >= 0) {
    addToAssets.call(this, path)
    addTask.call(this, path)
  }
  await runTask.call(this)
}

function watch () {
  const { srcRoot } = this.options
  const watcher = chokidar
    .watch(srcRoot, {
      ignoreInitial: true,
      ignored: /(^|[/\\])\../
    })
    .on('all', (event, path) => {
      if (event === 'change' || event === 'add' || event === 'unlink') {
        info('[@]', event, ':', path)
        addWatchTasks.call(this, path, event)
      }
    })
  info('[@]', 'watching on ...', 'press ctrl + c to exit.')
  return watcher
}

module.exports = watch
