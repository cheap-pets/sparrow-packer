const { resolve, join } = require('path');
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

function parseConfig(path) {
  try {
    error(process.cwd());
    let data = loadConfig(path || process.cwd());
    if (!data) {
      throw new Error('cannot load ".sparrowpacker.config.json" .');
    }
    if (!data.modules || !data.modules.length) {
      throw new Error('cannot find any module .');
    }
    config.sourceRoot = join(data.base, data.sourceRoot || '');
    config.outputRoot = join(data.base, data.outputRoot || '');
    config.modules = data.modules;
    config.format = data.format || 'iife';
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