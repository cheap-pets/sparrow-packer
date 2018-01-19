const { resolve, join, parse } = require('path')
const { readFileSync } = require('fs')
const glob = require('glob')
const jsdom = require('jsdom')
const pathIsInside = require('path-is-inside')

// <script src="a.js" main="./a/index.js" watch="../shared"></script>
// <link rel='stylesheet' href='a.css' main='./a/assert/index.css' dir="./a/assert">

const tag = (+new Date()).toString(36)

function getVersionedFilename (filePath) {
  const fo = parse(filePath)
  return join(fo.dir, fo.name + '.' + tag + fo.ext)
}

function extractCssConfig (pageFilename, element, pageConfig, config) {
  const hrefAttr = element.getAttribute('href')
  const mainAttr = element.getAttribute('main')
  const cssConfig = {
    element: element
  }
  if (mainAttr) {
    const entry = mainAttr ? join(pageFilename, '..', mainAttr) : null
    cssConfig.entry = entry
    cssConfig.dir = join(entry, '..')
    cssConfig.ref = hrefAttr ? getVersionedFilename(hrefAttr) : join('css', pageConfig.name + '.' + tag + '.css')
    element.setAttribute('href', cssConfig.ref)
    pageConfig.cssFiles.push(cssConfig)
  } else if (hrefAttr) {
    let dirAttr = element.getAttribute('include-dir')
    dirAttr === '' && (dirAttr = join(hrefAttr, '..'))
    const staticPath = join(pageFilename, '..', dirAttr || hrefAttr)
    config.staticFiles.indexOf(staticPath) < 0 && config.staticFiles.push(staticPath)
    element.removeAttribute('include-dir')
  }
}

function extractScriptConfig (pageFilename, element, pageConfig, config) {
  const srcAttr = element.getAttribute('src')
  const mainAttr = element.getAttribute('main')
  const scriptConfig = {
    element
  }
  if (mainAttr) {
    const entry = mainAttr ? join(pageFilename, '..', mainAttr) : null
    scriptConfig.entry = entry
    scriptConfig.dir = join(entry, '..')
    scriptConfig.ref = srcAttr ? getVersionedFilename(srcAttr) : join('js', pageConfig.name + '.' + tag + '.js')
    element.setAttribute('src', scriptConfig.ref)
    pageConfig.jsFiles.push(scriptConfig)
  } else if (srcAttr) {
    let dirAttr = element.getAttribute('include-dir')
    dirAttr === '' && (dirAttr = join(srcAttr, '..'))
    const staticPath = join(pageFilename, '..', dirAttr || srcAttr)
    config.staticFiles.indexOf(staticPath) < 0 && config.staticFiles.push(staticPath)
    element.removeAttribute('include-dir')
  }
}

function extractPageConfig (root, filename, config) {
  const content = readFileSync(join(root, filename)).toString()
  const dom = new jsdom.JSDOM(content)
  const document = dom.window.document
  const pageConfig = {
    file: filename,
    name: parse(filename).name,
    dom,
    jsFiles: [],
    cssFiles: []
  }
  const scriptNodes = document.querySelectorAll('script')
  for (let i = 0, len = scriptNodes.length; i < len; i++) {
    const element = scriptNodes[i]
    extractScriptConfig(filename, element, pageConfig, config)
  }
  const cssNodes = document.querySelectorAll('link[rel=stylesheet]')
  for (let i = 0, len = cssNodes.length; i < len; i++) {
    const element = cssNodes[i]
    extractCssConfig(filename, element, pageConfig, config)
  }
  config.pages.push(pageConfig)
}

function scanPageFiles (root, ext) {
  const config = {
    staticFiles: [],
    pages: []
  }
  const pattern = '**/*' + '.' + (ext || 'html')
  const files = glob.sync(pattern, { cwd: root })
  for (let i = 0, len = files.length; i < len; i++) {
    extractPageConfig(root, files[i], config)
  }
  return config
}

module.exports = scanPageFiles
