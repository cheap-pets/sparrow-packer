const { isAbsolute, parse, join, relative, resolve } = require('path')
const { readFileSync, statSync } = require('fs-extra')
const cheerio = require('cheerio')
const pretty = require('pretty')
const inside = require('path-is-inside')
const glob = require('glob')
const logger = require('./logger')

function resolvePath (root, path) {
  return root && root !== '' && !isAbsolute(path) ? join(root, path) : path
}

function add (assets, key, value, associationKey) {
  let asset = assets[key]
  if (!asset) {
    asset = assets[key] = value
    asset.changed = true
    logger.info('[+]', value.type + ':', key)
  } else {
    let isUniqueAssociation =
      asset.associations &&
      asset.associations.length === 1 &&
      asset.associations[0] === associationKey

    if (value.output && asset.output !== value.output && isUniqueAssociation) {
      asset.output = value.output
      asset.changed = true
    }
    if (asset.cssOutput !== value.cssOutput && isUniqueAssociation) {
      asset.cssOutput = value.cssOutput
      asset.changed = true
    }
    if (value.content) {
      asset.content = value.content
      asset.changed = true
    }
  }
  if (associationKey) {
    let associations = asset.associations
    if (!associations) associations = asset.associations = []
    if (associations.indexOf(associationKey) < 0) {
      associations.push(associationKey)
      logger.info('...', 'association:', key, '<->', associationKey)
    }
  }
  return asset
}

function addStaticPath (input, output, pageAssetKey) {
  const assets = this.assets
  for (let key in assets) {
    if (assets[key].type !== 'static') continue
    if (inside(input, key)) {
      input = key
      output = null
    } else if (inside(key, input)) {
      delete assets[key]
    }
  }
  return add(
    this.assets,
    input,
    {
      type: 'static',
      output
    },
    pageAssetKey
  )
}

function addScriptFile (input, output, cssOutput, pageAssetKey, watchPath) {
  if (watchPath) add(this.assets, watchPath, { type: 'watch' }, input)
  return add(
    this.assets,
    input,
    {
      type: 'script',
      output,
      cssOutput
    },
    pageAssetKey
  )
}

function addStyleFile (input, output, pageAssetKey, watchPath) {
  if (watchPath) add(this.assets, watchPath, { type: 'watch' }, input)
  if (this.options.browser !== false) this.options.browser = true
  return add(
    this.assets,
    input,
    {
      type: 'style',
      output
    },
    pageAssetKey
  )
}

function addWatchPath (watch, inputRoot, assetKey) {
  const arr = watch.trim().split(',')
  for (let i = 0, len = arr.length; i < len; i++) {
    const path = resolve(inputRoot, arr[i].trim())
    add(this.assets, path, { type: 'watch' }, assetKey)
  }
}

function getBundlePath (outputRoot, output, filename) {
  if (!output || output === '') {
    output = join(outputRoot, 'assets', filename)
  } else if (parse(output).ext !== '') {
    output = join(outputRoot, output)
  } else {
    output = join(outputRoot, output, filename)
  }
  return output
}

function processPageElement ($, element, pageInput, outputRoot, assetType) {
  if (this.options.browser !== false) this.options.browser = true
  const ref = element.attr('href') || element.attr('src')
  if (ref && ref.indexOf('://') > 0) return

  const { dir, name } = parse(pageInput)
  const main = element.attr('main')
  if (main && (assetType === 'style' || assetType === 'script')) {
    const input = resolve(dir, main)
    const ext = assetType === 'style' ? '.css' : '.js'
    const filebase = (element.attr('name') || name) + '.' + this.revision
    const output = getBundlePath(outputRoot, element.attr('output'), filebase + ext)
    let cssOutput = element.attr('css-output')
    if (cssOutput !== null && cssOutput !== undefined) {
      cssOutput = getBundlePath(outputRoot, cssOutput, filebase + '+.css')
    }
    const asset = assetType === 'style'
      ? addStyleFile.call(this, input, output, pageInput)
      : addScriptFile.call(this, input, output, cssOutput, pageInput)

    const watch = parse(input).dir
    addWatchPath.call(this, watch, dir, input)
    const watch2 = element.attr('watch')
    if (watch2) addWatchPath.call(this, watch2, dir, input)

    element.removeAttr('main')
    element.removeAttr('watch')
    element.removeAttr('output')
    element.removeAttr('css-output')
    element.attr(assetType === 'style' ? 'href' : 'src', relative(outputRoot, asset.output))
    if (cssOutput !== null && cssOutput !== undefined) {
      $('<link rel="stylesheet" type="text/css"></link>')
        .attr('href', relative(outputRoot, asset.cssOutput))
        .appendTo($('head'))
    }
  } else if (ref) {
    let input
    let output
    // if (ref.indexOf('++') === 0) {
    //   // input = require.resolve(ref.substr(2))
    //   // output = resolve(outputRoot, element.getAttribute('output'))
    //   return
    // } else {
    input = resolve(dir, ref)
    output = resolve(outputRoot, ref) // element.getAttribute('output') || ref
    // }
    addStaticPath.call(this, input, output, pageInput)
    if (assetType === 'static') element.remove()
  }
}

function addPageFile (input, output) {
  const outDir = parse(output).dir
  const content = readFileSync(input).toString()
  const $ = cheerio.load(content)

  $('link[rel=stylesheet]').each((index, element) => {
    processPageElement.call(this, $, $(element), input, outDir, 'style')
  })
  $('link[rel=static]').each((index, element) => {
    processPageElement.call(this, $, $(element), input, outDir, 'static')
  })
  $('script').each((index, element) => {
    processPageElement.call(this, $, $(element), input, outDir, 'script')
  })
  add(this.assets, input, {
    type: 'page',
    output,
    content: pretty($.html())
  })
}

function addFile (input, output) {
  const { pageExt, scriptExt, styleExt } = this.options
  let { ext, base } = parse(input)
  ext = ext.substr(1)
  if (parse(output).ext === '') {
    output = join(output, base)
  }
  if (pageExt.indexOf(ext) >= 0) {
    addPageFile.call(this, input, output)
  } else if (scriptExt.indexOf(ext) >= 0) {
    addScriptFile.call(this, input, output, null, null, parse(input).dir)
  } else if (styleExt.indexOf(ext) >= 0) {
    addStyleFile.call(this, input, output, null, parse(input).dir)
  }
}

function addDir (input, output) {
  const pattern = '**/' + '+(*.' + this.options.pageExt.join('|*.') + ')'
  const files = glob.sync(pattern, { cwd: input })
  if (files.length) {
    for (let i = 0, len = files.length; i < len; i++) {
      const pageInput = join(input, files[i])
      const pageOutput = join(output, files[i])
      addPageFile.call(this, pageInput, pageOutput)
    }
  } else {
    addStaticPath.call(this, input, output)
  }
}

function addToAssets (input, output, isStatic) {
  const { srcRoot, distRoot } = this.options
  input = resolvePath(srcRoot, input || '')
  output = resolvePath(distRoot, output || relative(srcRoot, input))
  const fileStat = statSync(input)
  if (isStatic) {
    addStaticPath.call(this, input, output)
  } else if (fileStat.isDirectory()) {
    addDir.call(this, input, output)
  } else if (fileStat.isFile()) {
    addFile.call(this, input, output)
  }
  return this
}

module.exports = addToAssets
