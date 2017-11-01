const { resolve, join, parse, relative } = require('path');
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

function parseModuleConfig(module, sourceRoot, outputRoot) {
  const { name, source, output } = module;
  if (!source) return;
  const srcDir = join(sourceRoot, source.dir || '');
  const data = {};
  if (source.script) {
    data.script = {
      input: join(srcDir, source.script),
      output: join(outputRoot, output.script || (name + '.js'))
    }
  }
  if (source.page) {
    const pageInput = join(srcDir, source.page);
    const { ext } = parse(pageInput);
    data.page = {
      input: pageInput,
      output: join(outputRoot, output.page || (name + ext))
    }
  }
  if (source.css || output.css) {
    data.css = {
      input: source.css ? join(srcDir, source.css) : null,
      output: join(outputRoot, output.css || (name + '.css'))
    }
  }
  for (let s in source) {
    if (['script', 'page', 'css'].indexOf(s) >= 0) continue;
    data[s] = {
      input: join(srcDir, source[s]),
      output: join(outputRoot, output[s])
    }
  }
}

function parseConfig(path) {
  try {
    error(process.cwd());
    let data = loadConfig(path || process.cwd());
    if (!data) {
      throw new Error('cannot load ".sparrowpacker.config.json" .');
    }
    for (let p in data) {
      if (['sourceRoot', 'outputRoot', 'modules'].indexOf(p) >= 0) continue;
      config[p] = data[p];
    }
    config.sourceRoot = join(data.base, data.sourceRoot || '');
    config.outputRoot = join(data.base, data.outputRoot || '');
    config.modules = [];
    data.modules.forEach(item => {
      const module = parseModuleConfig(item, config.sourceRoot, config.outputRoot);
      module && config.modules.push(module);
    });
    if (!config.modules.length) {
      throw new Error('cannot find any module .');
    }
  }
  catch (e) {
    error(e.message);
    process.exit(1);
  }
  return config;
}

module.exports = {
  config,
  parseConfig
}