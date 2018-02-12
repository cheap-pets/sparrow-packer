const { join, parse } = require('path')
const { readFileSync, statSync } = require('fs-extra')
const glob = require('glob')
const jsdom = require('jsdom')

const tag = (+new Date()).toString(36)

function getVersionedFilename (filePath, prefix) {
  const fo = parse(filePath)
  return join(fo.dir, fo.name + '.' + (prefix || '') + tag + fo.ext)
}

function addToConfig (path, value, config) {
  if (!config[path]) {
    config[path] = value
  }
}

function addWatch (watchPath, notifyKey, config) {
  let watchConfig = config[watchPath]
  if (!config[watchPath]) {
    watchConfig = config[watchPath] = {
      type: 'watch',
      notify: [notifyKey]
    }
  } else if (watchConfig.notify.indexOf(notifyKey) < 0) {
    watchConfig.notify.push(notifyKey)
  }
}

function addWatchs (watchAtrr, pageFile, notifyKey, config) {
  const arr = watchAtrr.trim().split(',')
  for (let i = 0, len = arr.length; i < len; i++) {
    let watchPath = arr[i].trim()
    watchPath = join(pageFile, '..', watchPath)
    addWatch(watchPath, notifyKey, config)
  }
}

function addCss (pageFile, element, page, config) {
  const hrefAttr = element.getAttribute('href')
  const mainAttr = element.getAttribute('main')

  let input
  let output
  let type
  if (mainAttr) {
    type = 'css'
    input = join(pageFile, '..', mainAttr)
    output = join(
      pageFile,
      '..',
      hrefAttr ? getVersionedFilename(hrefAttr) : join('css', page.name + '.' + tag + '.css')
    )
    const dir = join(pageFile, '..', input, '..')
    addWatch(dir, input, config)
    const watchAttr = element.getAttribute('watch')
    watchAttr && addWatchs(watchAttr, pageFile, input, config)
    element.setAttribute('href', output)

    let dirAttr = element.getAttribute('include-dir')
    if (dirAttr && dirAttr !== '') {
      let dirInput = join(pageFile, '..', dirAttr)
      addToConfig(
        dirInput,
        {
          type: 'static',
          output: dirInput
        },
        config
      )
    }

    element.removeAttribute('main')
    element.removeAttribute('watch')
    element.removeAttribute('include-dir')
  } else if (hrefAttr) {
    type = 'css'
    let dirAttr = element.getAttribute('include-dir')
    dirAttr === '' && (dirAttr = join(hrefAttr, '..'))
    type = 'static'
    input = join(pageFile, '..', dirAttr || hrefAttr)
    output = input
    element.removeAttribute('include-dir')
  } else return

  addToConfig(
    input,
    {
      type,
      output
    },
    config
  )
}

function addScript (pageFile, element, page, config) {
  const srcAttr = element.getAttribute('src')
  if (srcAttr.indexOf('://') > 0) return
  const mainAttr = element.getAttribute('main')
  const cssAttr = element.getAttribute('css')
  let type
  let input
  let output
  let cssOutput
  if (mainAttr) {
    type = 'script'
    input = join(pageFile, '..', mainAttr)
    output = join(
      pageFile,
      '..',
      srcAttr ? getVersionedFilename(srcAttr) : join('js', page.name + '.' + tag + '.js')
    )
    if (cssAttr) {
      const href = getVersionedFilename(cssAttr, 'inline.')
      cssOutput = join(pageFile, '..', href)
      const { document } = page.dom.window
      const head = document.head
      const cssElm = document.createElement('link')
      cssElm.setAttribute('rel', 'stylesheet')
      cssElm.setAttribute('type', 'text/css')
      cssElm.setAttribute('href', href)
      head.appendChild(cssElm)
    }
    const dir = join(pageFile, '..', input, '..')
    addWatch(dir, input, config)
    const watchAttr = element.getAttribute('watch')
    watchAttr && addWatchs(watchAttr, pageFile, input, config)
    element.setAttribute('src', output)
    element.removeAttribute('main')
    element.removeAttribute('css')
  } else if (srcAttr) {
    type = 'static'
    let dirAttr = element.getAttribute('include-dir')
    dirAttr === '' && (dirAttr = join(srcAttr, '..'))
    input = join(pageFile, '..', dirAttr || srcAttr)
    output = input
    element.removeAttribute('include-dir')
  } else return

  addToConfig(
    input,
    {
      type,
      output,
      cssOutput
    },
    config
  )
}

function addPage (root, pageFile, config) {
  const content = readFileSync(join(root, pageFile)).toString()
  const dom = new jsdom.JSDOM(content)
  const document = dom.window.document
  const page = {
    type: 'page',
    name: parse(pageFile).name,
    output: pageFile,
    dom
  }
  const cssNodes = document.querySelectorAll('link[rel=stylesheet]')
  for (let i = 0, len = cssNodes.length; i < len; i++) {
    addCss(pageFile, cssNodes[i], page, config)
  }
  const scriptNodes = document.querySelectorAll('script')
  for (let i = 0, len = scriptNodes.length; i < len; i++) {
    addScript(pageFile, scriptNodes[i], page, config)
  }
  config[pageFile] = page
}

function scanPageFiles (path, ext) {
  const config = {}
  const pattern = '**/*' + '.' + (ext || 'html')
  const stat = statSync(path)
  if (stat.isDirectory()) {
    const files = glob.sync(pattern, { cwd: path })
    for (let i = 0, len = files.length; i < len; i++) {
      addPage(path, files[i], config)
    }
  } else if (stat.isFile()) {
    const pageDir = parse(path).dir
    const pageFile = parse(path).base
    addPage(pageDir, pageFile, config)
  }

  return config
}

module.exports = scanPageFiles
