const rollup = require('rollup')

// const buildinsPlugin = require('rollup-plugin-node-builtins')()
// const replacePlugin = require('rollup-plugin-replace')
const resolvePlugin = require('rollup-plugin-node-resolve')({ jsnext: true, main: true })
const commonjsPlugin = require('rollup-plugin-commonjs')()
const uglifyPlugin = require('rollup-plugin-uglify')()
const babelPlugin = require('rollup-plugin-babel')()
const vuePlugin = require('rollup-plugin-vue')
const jsonPlugin = require('rollup-plugin-json')()
const rePlugin = require('rollup-plugin-re')
const rePluginNode = rePlugin({
  // ... do replace before commonjs
  patterns: [
    {
      // regexp match with resolved path
      match: /formidable(\/|\\)lib/,
      // string or regexp
      test: 'if (global.GENTLY) require = GENTLY.hijack(require);',
      // string or function to replaced with
      replace: ''
    }
  ]
})
const rePluginBrowser = rePlugin({
  replaces: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  }
})

const { parse } = require('path')
const { info } = require('./logger')
const bundleStyles = require('./bundle-styles')

async function bundleScript (input, output, cssOutput, options) {
  const { browser, node, name, sourcemap, globals, uglify, format } = options || {}
  info('[>]', 'script:', input)
  let styles = ''
  const plugins = []
  if (browser) {
    plugins.push(
      vuePlugin({
        css: s => {
          styles += s
        }
      })
    )
    plugins.push(
      resolvePlugin,
      babelPlugin,
      rePluginBrowser
    )
  } else {
    plugins.push(
      rePluginNode,
      resolvePlugin,
      commonjsPlugin,
      jsonPlugin
      // babelPlugin
      // buildinsPlugin
    )
  }
  if (uglify) plugins.push(uglifyPlugin)
  let bundle = await rollup.rollup({
    input,
    plugins
  })
  await bundle.write({
    name: name || parse(output).name,
    format: format || node ? 'cjs' : 'iife',
    file: output,
    sourcemap,
    globals
  })
  info('...', 'output:', output)
  if (cssOutput) {
    await bundleStyles(null, cssOutput, styles)
  }
}

module.exports = bundleScript
