const scan = require('./scan-page-files')
const { resolve, parse } = require('path')
const { info, warn } = require('./log')
const {
  copySync,
  mkdirsSync,
  readFileSync,
  writeFileSync,
  emptyDirSync,
  statSync
} = require('fs-extra')

const isInsidePath = require('path-is-inside')
const chokidar = require('chokidar')

const rollup = require('rollup')
const rollBabel = require('rollup-plugin-babel')
const rollResolve = require('rollup-plugin-node-resolve')
const rollVue = require('rollup-plugin-vue')
const rollReplace = require('rollup-plugin-replace')
const rollUglify = require('rollup-plugin-uglify')
let rollPlugins = [
  rollResolve(),
  rollBabel(),
  rollReplace({
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  })
]

const postcss = require('postcss')
const precss = require('precss')
const unPrefix = require('postcss-unprefix')
const autoprefixer = require('autoprefixer')
// const triangle = require('postcss-triangle')
const cssProcessor = postcss([precss, unPrefix, autoprefixer]) // triangle

const CleanCss = require('clean-css')
const cssCleaner = new CleanCss({
  format: {
    breaks: {
      // controls where to insert breaks
      afterAtRule: true, // controls if a line break comes after an at-rule; e.g. `@charset`; defaults to `false`
      afterBlockBegins: true, // controls if a line break comes after a block begins; e.g. `@media`; defaults to `false`
      afterBlockEnds: true, // controls if a line break comes after a block ends, defaults to `false`
      afterComment: true, // controls if a line break comes after a comment; defaults to `false`
      afterProperty: true, // controls if a line break comes after a property; defaults to `false`
      afterRuleBegins: true, // controls if a line break comes after a rule begins; defaults to `false`
      afterRuleEnds: true, // controls if a line break comes after a rule ends; defaults to `false`
      beforeBlockEnds: true, // controls if a line break comes before a block ends; defaults to `false`
      betweenSelectors: true // controls if a line break comes between selectors; defaults to `false`
    },
    spaces: {
      // controls where to insert spaces
      aroundSelectorRelation: true, // controls if spaces come around selector relations; e.g. `div > a`; defaults to `false`
      beforeBlockBegins: true, // controls if a space comes before a block begins; e.g. `.block {`; defaults to `false`
      beforeValue: true // controls if a space comes before a value; e.g. `width: 1rem`; defaults to `false`
    },
    indentBy: 2
  }
})

async function copy (input, output) {
  info('[copy]', input, '->', output)
  copySync(input, output)
}

async function bundleStyles (input, output, styles) {
  input && info('[style]', 'source :', input)
  styles = (input ? readFileSync(input).toString() : '') + (styles || '')
  const { css, warnings } = await cssProcessor.process(styles, {
    from: input
  })
  for (let i = 0, len = warnings.length; i < len; i++) {
    warn(warnings[i].text)
  }
  mkdirsSync(parse(output).dir)
  writeFileSync(output, cssCleaner.minify(css).styles)
  info('[style]', 'output :', output)
}

async function bundleScript (input, output, cssOutput, options) {
  const { name, sourcemap, globals, uglify, format } = options || {}
  info('[rollup]', 'source :', input)
  let styles = ''
  const plugins = [
    rollVue({
      css: s => {
        styles += s
      }
    })
  ].concat(rollPlugins)
  if (uglify) {
    plugins.push(rollUglify())
  }
  let bundle = await rollup.rollup({
    input,
    plugins
  })
  await bundle.write({
    name: name || parse(output).name,
    format: format || 'iife',
    file: output,
    sourcemap,
    globals
  })
  info('[rollup]', 'output :', output)
  if (cssOutput) {
    await bundleStyles(null, cssOutput, styles)
  }
}

async function outputPage (dom, output) {
  mkdirsSync(parse(output).dir)
  writeFileSync(output, dom.serialize())
  info('[page]', 'output :', output)
}

async function packItem (src, dist, options, config, path) {
  let { type, output, cssOutput, dom } = config[path]
  if (!output) return
  const input = resolve(src, path)
  output && (output = resolve(dist, output))
  cssOutput && (cssOutput = resolve(dist, cssOutput))
  switch (type) {
    case 'page':
      await outputPage(dom, output)
      break
    case 'script':
      await bundleScript(input, output, cssOutput, options)
      break
    case 'css':
      await bundleStyles(input, output)
      break
    case 'static':
      await copy(input, output)
      break
  }
}

const watcheTaskList = []
let watcher
let running = false

async function runTask (src, dist, options, config) {
  if (running || !watcheTaskList.length) return
  running = true
  const path = watcheTaskList.shift()
  packItem(src, dist, options, config, path)
  //
  running = false
  await runTask()
}

async function addWatchTask (src, dist, options, config, path) {
  if (watcheTaskList.indexOf(path) < 0) watcheTaskList.push(path)
  await runTask(src, dist, options, config)
}

function addWatchTasks (src, dist, options, config, notifyPath) {
  for (const path in config) {
    let { type, notify } = config[path]
    if (type === 'static' || type === 'watch' || type === 'page') {
      const input = resolve(src, path)
      if (isInsidePath(notifyPath, input)) {
        switch (type) {
          case 'page':
          case 'static':
            addWatchTask(src, dist, options, config, path)
            break
          case 'watch':
            if (notify) {
              for (let i = 0, len = notify.length; i < len; i++) {
                addWatchTask(src, dist, options, config, notify[i])
              }
            }
            break
        }
      }
    }
  }
}

function watchFiles (src, dist, options, config) {
  watcher = chokidar
    .watch(src, {
      ignoreInitial: true,
      ignored: /(^|[/\\])\../
    })
    .on('all', (event, notifyPath) => {
      if (event === 'change' || event === 'add' || event === 'unlink') {
        info('[notify]', event, ':', notifyPath)
        addWatchTasks(src, dist, options, config, notifyPath)
      }
    })
}

function watchOff () {
  watcher && watcher.close()
}

async function pack (src, dist, options, watch) {
  options = options || {}
  watch = watch || options.watch

  const srcStat = statSync(src)
  const isDir = srcStat.isDirectory()
  const isFile = srcStat.isFile()
  const base = isFile ? parse(src).base : null
  const ext = isFile ? parse(src).ext : null
  let config
  if (ext === '.css' || ext === '.pcss' || ext === '.js') {
    const dir = parse(src).dir
    config = {
      [base]: {
        type: ext === '.js' ? 'script' : 'css',
        output: parse(dist).base
      },
      [dir]: {
        type: 'watch',
        notify: [base]
      }
    }
  } else if (isDir || isFile) {
    config = scan(src)
  }

  if (isDir) {
    options.clean !== false && emptyDirSync(dist)
  } else if (isFile) {
    src = parse(src).dir
    parse(dist).ext !== '' && (dist = parse(dist).dir)
  }

  // pack files
  for (const path in config) {
    await packItem(src, dist, options, config, path)
  }

  // watch files
  if (watch) {
    info('[watch]', 'watching on ...', 'press ctrl + c to exit.')
    watchFiles(src, dist, options, config)
  }
}

function packAndWatch (src, dist, options) {
  options = options || {}
  options.watch = true
  pack(src, dist, options)
}

module.exports = {
  pack,
  packAndWatch,
  watchOff
}
