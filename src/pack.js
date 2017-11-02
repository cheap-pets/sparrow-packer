const { join, parse, relative } = require('path');
const { copySync, mkdirsSync, readFileSync, writeFileSync } = require('fs-extra');
const jsdom = require('jsdom');

const rollup = require('rollup');
const rollBabel = require('rollup-plugin-babel');
const rollResolve = require('rollup-plugin-node-resolve');
const rollVue = require('rollup-plugin-vue');
const rollReplace = require('rollup-plugin-replace');
let rollPlugins;

const { info, error } = require('./log');
const { config } = require('./config');

const tag = (+new Date()).toString(36);

async function copy(input, output) {
  info('[copy]', input, '->', output);
  copySync(input, output);
}

function insertVersion(filePath, version) {
  if (version === false) return filePath;
  version = version === 'auto' ? tag : version;
  const fo = parse(filePath);
  return join(fo.dir, fo.name + '.' + version + fo.ext);
}

async function processScript(module, source, output) {
  info('[rollup]', 'source :', source);
  this.scriptReference = output = insertVersion(output, config.bundle.version);
  output = join(config.outputRoot, output);
  let bundle = await rollup.rollup({
    input: source,
    plugins: rollPlugins
  });
  await bundle.write({
    name: module.name,
    format: config.format || 'iife',
    file: output
  });
  info('[rollup]', 'output :', output);
}

async function processCss(module, source, output) {
  // not yet
}

function calcRelativePath(source, target) {
  let path;
  if (config.bundle.relativePath) {
    path = config.bundle.relativePath + target;
  } else {
    const dir = parse(join(config.outputRoot, source)).dir;
    path = relative(dir, join(config.outputRoot, target));
  }
  return path;
}

async function processPage(module, source, output) {
  info('[page]', 'source :', source);
  const fullOutput = join(config.outputRoot, output);
  if (config.bundle.autoInsert && (this.scriptReference || this.cssReference)) {
    const html = readFileSync(source).toString();
    const dom = new jsdom.JSDOM(html);
    const { document } = dom.window;
    const head = document.head;
    const body = document.body;
    if (this.scriptReference) {
      const scriptNode = document.createElement('script');
      scriptNode.setAttribute('type', 'text/javascript');
      scriptNode.setAttribute('src', calcRelativePath(output, this.scriptReference));
      body.appendChild(scriptNode);
    }
    if (this.cssReference) {
      const cssNode = document.createElement('link');
      cssNode.setAttribute('rel', 'stylesheet');
      cssNode.setAttribute('href', calcRelativePath(output, this.cssReference));
      head.appendChild(cssNode);
    }
    mkdirsSync(parse(fullOutput).dir);
    writeFileSync(fullOutput, dom.serialize());
  } else {
    copySync(source, fullOutput);
  }
  info('[page]', 'output :', fullOutput);
}

function initRollPlugins() {
  if (!rollPlugins) {
    rollPlugins = [
      rollResolve(),
      rollVue(),
      rollBabel(),
      rollReplace({
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
      })
    ];
    if ((config.vue || {}).vueClientRender) {
      const rollAlias = require('rollup-plugin-alias');
      rollPlugins.unshift(
        rollAlias({
          vue: join(parse(require.resolve('vue')).dir, 'vue.esm.js')
        })
      );
    }
  }
}

async function packOne(module) {
  try {
    const { script, css, page } = module;
    const context = {};
    script && (await processScript.call(context, module, script.source, script.output));
    css && (await processCss.call(context, module, css.source, css.output));
    page && (await processPage.call(context, module, page.source, page.output));
    for (let s in module) {
      if (['$name', '$watch', 'script', 'css', 'page'].indexOf(s) >= 0) continue;
      const { source, output } = module[s];
      await copy(source, join(config.outputRoot, output));
    }
  } catch (e) {
    error(e);
  }
}

async function packAll() {
  initRollPlugins();
  for (let i = 0, len = config.modules.length; i < len; i++) {
    await packOne(config.modules[i]);
  }
}

module.exports = {
  packOne,
  packAll
};
