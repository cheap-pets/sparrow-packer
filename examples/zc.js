const { join } = require('path')
const { zcPackAndWatch } = require('../src')

const src = join(__dirname, 'src')
const dist = join(__dirname, 'dist')

zcPackAndWatch(src, dist)
