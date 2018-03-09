const { join } = require('path')
const Packer = require('../src')

const srcRoot = join(__dirname, 'src')
const distRoot = join(__dirname, 'dist')

const packer = new Packer({
  srcRoot,
  distRoot,
  watch: true
})

packer.addAll().run()
