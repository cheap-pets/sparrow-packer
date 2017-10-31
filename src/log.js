function info () {
  console.info.apply(this, arguments);
}

function error () {
  console.error.apply(this, arguments);
}

module.exports = {
  info,
  error
}