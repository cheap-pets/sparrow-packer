#!/usr/bin/env node

const { isAbsolute, join, resolve, parse } = require('path')
const { statSync, existsSync } = require('fs-extra')
const { info, error } = require('./log')

const { pack } = require('./zero-config-pack')

const argv = require('yargs')
  .alias('c', 'clean')
  .alias('w', 'watch')
  .argv

const cwd = process.cwd()
const paths = argv._

let src = paths[0] || cwd
let dist = paths[1]

if (!isAbsolute(src)) {
  src = resolve(cwd, src)
}

if (!existsSync(src)) {
  error('cannot find source path : ', src)
  process.exit(1)
}

const srcStat = statSync(src)
if (srcStat.isDirectory()) {
  if (parse(src).base !== 'src' && !dist) {
    const deepSrc = resolve(src, 'src')
    if (existsSync(deepSrc)) {
      src = deepSrc
    }
  }
}

if (!dist) {
  dist = resolve(src, '..', 'dist')
} else if (!isAbsolute(dist)) {
  dist = resolve(cwd, dist)
}

if (!existsSync(src)) {
  error('cannot find target path : ', src)
  process.exit(1)
}

info('ready to pack ...')
info('[source]', src)
info('[target]', dist)
pack(src, dist, {
  clean: !!argv.clean,
  watch: !!argv.watch
})

console.log(parse(src).ext)
