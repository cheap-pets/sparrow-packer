const { join, parse, relative } = require('path');
const { existsSync, readFileSync, writeFileSync, copySync } = require('fs-extra');

const rollup = require('rollup');
const rollBabel = require('rollup-plugin-babel');
const rollResolve = require('rollup-plugin-node-resolve');
const rollVue = require('rollup-plugin-vue');
const rollReplace = require('rollup-plugin-replace');

const jsdom = require('jsdom');

const { info, error } = require('./log');
const { config } = require('./config');

async function copyFiles(input, output) {}

function reviseFilename(filename, ext, tag) {
  const idx = filename.lastIndexOf(ext);
  const len = filename.length;
  if (idx === len - 3) {
    filename = filename.substr(0, idx);
  }
  if (tag) filename += '.' + tag;
  filename += ext;
  return filename;
}

async function processScript(tag) {
  this.input = reviseFilename(join(config.sourceRoot, this.module.source.dir || '', this.module.source.script), '.js');
  this.outputScript = reviseFilename(
    join(config.outputRoot, this.module.output.script || this.module.name),
    '.js',
    tag
  );
  info('rollup begin, entry:', this.input, ' ...');
  let bundle = await rollup.rollup({
    input: this.input,
    plugins: [
      rollReplace({
        'process.env.NODE_ENV': JSON.stringify('production')
      }),
      rollResolve(),
      rollVue(),
      rollBabel()
    ]
  });
  await bundle.write({
    name: this.module.name,
    format: config.format,
    file: this.outputScript
  });
  info('rollup completed, output script: ', this.outputScript, ' .');
}

function processPage() {
  const input = join(config.sourceRoot, this.module.source.dir || '', this.module.source.page);
  const { ext } = parse(input);
  const output = join(config.outputRoot, this.module.output.page || this.module.name + ext);
  if (this.outputScript || this.outputCss) {
    const html = readFileSync(input).toString();
    const dom = new jsdom.JSDOM(html);
    const { document } = dom.window;
    const head = document.head;
    const body = document.body;
    if (this.outputScript) {
      const scriptNode = document.createElement('script');
      scriptNode.setAttribute('type', 'text/javascript');
      scriptNode.setAttribute('src', relative(parse(output).dir, this.outputScript));
      body.appendChild(scriptNode);
    }
    if (this.outputCss) {
      const cssNode = document.createElement('link');
      cssNode.setAttribute('rel', 'stylesheet');
      cssNode.setAttribute('href', relative(output, this.outputCss));
      head.appendChild(cssNode);
    }
    writeFileSync(output, dom.serialize());
  }
}

async function packOne(module, tag) {
  const source = module.source;
  if (!source) return;
  try {
    const context = { module };
    source.script && (await processScript.call(context, tag));
    source.page && (await processPage.call(context));
  } catch (e) {
    error(e);
  }
}

async function packAll() {
  const tag = (+new Date()).toString(36);
  for (let i = 0, len = config.modules.length; i < len; i++) {
    await packOne(config.modules[i], tag);
  }
}

module.exports = {
  packOne,
  packAll
};
