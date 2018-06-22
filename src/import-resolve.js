const path = require('path')
const { existsSync, statSync, readFileSync } = require('fs')

function importResolve (id, cwd) {
  return new Promise(resolve => {
    const file = /^\//.test(id)
      ? id
      : /^\./.test(id) ? path.resolve(cwd, id) : require.resolve(id, { paths: [cwd] })
    if (existsSync(file) && statSync(file).isFile()) {
      const contents = readFileSync(file)
      resolve({
        file,
        contents
      })
    } else {
      throw new Error('file does not exist')
    }
  })
}

module.exports = importResolve
