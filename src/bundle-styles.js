const { mkdirsSync, readFileSync, writeFileSync } = require('fs-extra')
const { parse } = require('path')
const { info, warn } = require('./logger')
// const importResolve = require('./import-resolve')

const postcss = require('postcss')
const atImport = require('postcss-import')()
const precss = require('precss') // ({ resolve: importResolve })
const unPrefix = require('postcss-unprefix')
const autoprefixer = require('autoprefixer')
const mixins = require('postcss-mixins')
// const triangle = require('postcss-triangle')
const cssProcessor = postcss([atImport, precss, mixins, unPrefix, autoprefixer]) // triangle

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

async function bundleStyles (input, output, styles) {
  input && info('[>]', 'style:', input)
  styles = (input ? readFileSync(input).toString() : '') + (styles || '')
  const { css, warnings } = await cssProcessor.process(styles, {
    from: input
  })
  for (let i = 0, len = warnings.length; i < len; i++) {
    warn('...', 'bad-style:', warnings[i].text)
  }
  mkdirsSync(parse(output).dir)
  writeFileSync(output, cssCleaner.minify(css).styles)
  info('...', 'output:', output)
}

module.exports = bundleStyles
