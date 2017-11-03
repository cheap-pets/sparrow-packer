const isInside = require('path-is-inside');
const chokidar = require('chokidar');
const { parse, join } = require('path');

const { info } = require('./log');
const { packOne } = require('./pack');

const { config } = require('./config');

let watcher;
let taskList = [];
let running = false;

async function runTask() {
  if (running || !taskList.length) return;
  running = true;
  const module = taskList.shift();
  await packOne(module);
  running = false;
  await runTask();
}

async function addModuleTask(module) {
  if (taskList.indexOf(module) < 0) taskList.push(module);
  runTask();
}

function checkInsideModule(path, module) {
  for (let p in module) {
    const item = module[p];
    let dir;
    switch (p) {
      case '$name':
        break;
      case 'script':
      case 'css':
        dir = item.source ? parse(item.source).dir : null;
        break;
      case '$watch':
        for (let i = 0; i < item.length; i ++) {
          dir = join(config.sourceRoot, item[i]);
          if (isInside(path, dir)) {
            addModuleTask(module);
            return;
          }
        }
        break;
      default:
        dir = item.source;
        break;
    }
    if (dir && isInside(path, dir)) {
      addModuleTask(module);
      return;
    }
  }
}

function watch() {
  watcher = chokidar
  .watch(config.sourceRoot, {
    ignoreInitial: true,
    ignored: /(^|[/\\])\../
  })
  .on('all', (event, path) => {
    if (event === 'change' || event === 'add' || event === 'unlink') {
      info('[file-change]', event, ':', path);
      config.modules.forEach(module => {
        checkInsideModule(path, module)
      });
    }
  });
}

function watchOff() {
  watcher && watcher.close();
}

module.exports = {
  watch,
  watchOff
};

