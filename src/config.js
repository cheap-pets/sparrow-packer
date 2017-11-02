const { join, parse, resolve } = require('path');
const { existsSync, readFileSync } = require('fs-extra');
const stripJsonComments = require('strip-json-comments');
const { error } = require('./log');

const config = {};

function loadConfig(path) {
  const f = join(path, '.sparrowpacker.config.json');
  let data;
  if (existsSync(f)) {
    data = JSON.parse(stripJsonComments(readFileSync(f, 'utf8')));
    data.base = path;
  } else if (!existsSync(join(path, 'package.json'))) {
    let parent = resolve(path, '..');
    parent !== path && (data = loadConfig(parent));
  }
  return data;
}

function parseModuleConfig(module) {
  const { name, source, watch } = module;
  const output = module.output || {};
  if (!source) return;
  const { sourceRoot, bundle } = config;
  const sourceDir = join(sourceRoot, source.dir || '');
  const data = {
    $name: name,
    $watch: watch
  };

  for (let s in source) {
    const src = (s === 'dir') ? null : join(sourceDir, source[s]);
    if (!src || !existsSync(src)) continue;
    let out;
    switch (s) {
      case 'script':
        out = join(bundle.scriptPath || '', output.script || name + '.js');
        break;
      case 'css':
        out = join(bundle.cssPath || '', output.css || name + '.js');
        break;
      case 'page':
        out = join(bundle.pagePath || '', output.page || parse(source.page).base);
        break;
      default:
        out = output[s] || source[s];
    }
    data[s] = {
      source: src,
      output: out
    };
  }
  return data;
}

function parseConfig(path) {
  try {
    let data = loadConfig(path || process.cwd());
    if (!data) {
      throw new Error('cannot load ".sparrowpacker.config.json" .');
    }
    data.bundle = data.bundle || {
      "version": "auto"
    };
    for (let p in data) {
      switch (p) {
        case 'sourceRoot':
        case 'outputRoot':
          config[p] = join(data.base, data[p] || '');
          break;
        case 'modules':
          config[p] = [];
          break;
        default:
          config[p] = data[p];
      }
    }
    data.modules.forEach(item => {
      const module = parseModuleConfig(item);
      module && config.modules.push(module);
    });
    if (!config.modules.length) {
      throw new Error('cannot find any module .');
    }
  } catch (e) {
    error(e.message);
    process.exit(1);
  }
  return config;
}

module.exports = {
  config,
  parseConfig
};
