const { resolve, join, parse } = require('path');
const { existsSync, readFileSync, writeFileSync, copySync } = require('fs-extra');
const isInside = require('path-is-inside');
const chokidar = require('chokidar');
const stripJsonComments = require('strip-json-comments');

const rollup = require('rollup');
const rollBabel = require('rollup-plugin-babel');
const rollResolve = require('rollup-plugin-node-resolve');
const rollVue = require('rollup-plugin-vue');

const watchList = {};
let sourceRoot;
let outputRoot;
let modules;
let format;

function loadConfig(path) {
  const f = join(path, 'otter.config.json');
  let config;
  if (existsSync(f)) {
    config = JSON.parse(stripJsonComments(readFileSync(f, 'utf8')));
    config.base = path;
  } else if (!existsSync(join(path, 'package.json'))) {
    let parent = resolve(path, '..');
    parent !== path && (config = loadConfig(parent));
  }
  if (!config) {
    throw new Error('cannot load "otter.config.json" .');
  }
  return config;
}

function parseConfig(path) {
  const config = loadConfig(path || process.cwd());
  sourceRoot = resolve(config.base, config.sourceRoot || '');
  outputRoot = config.outputRoot || '';
  modules = config.modules;
  format = config.format || 'iife';
  if (!modules || !modules.length) {
    throw new Error('cannot find any module .');
  }
}

async function rollupModule(module, tag) {
  const script = resolve(sourceRoot || '', module.source.dir || '', module.source.script);
  const output = resolve(outputRoot || '', module.output.script);
  try {
    let bundle = await rollup.rollup({
      input: script,
      plugins: [rollResolve(), rollVue(), rollBabel()]
    });
    await bundle.write({
      name: module.name,
      format,
      file: output
    });
  } catch (error) {
    console.error(error);
  }
}

async function packModule(module) {
  rollupModule(module);
}

async function packModules() {
  modules.forEach(packModule);
}

async function watch() {

}

async function pack(path) {
  try {
    parseConfig(path);
    await packModules();
  } catch (error) {
    console.error(error.message);
  }
}

async function packAndWatch(path) {
  await pack(path);
  watch();
}

module.exports = {
  pack,
  packAndWatch
}
