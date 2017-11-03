const { blue, red, yellow } = require('chalk');

function info () {
  console.info.apply(this, Array.prototype.concat.apply([blue('[info]')], arguments));
}

function warn () {
  console.warn.apply(this, Array.prototype.concat.apply([yellow('[warn]')], arguments));
}

function error () {
  console.error.apply(this, Array.prototype.concat.apply([red('[error]')], arguments));
}

module.exports = {
  info,
  warn,
  error
}