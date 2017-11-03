const { join, parse, relative } = require('path');
const { copySync, mkdirsSync, readFileSync, writeFileSync } = require('fs-extra');
const jsdom = require('jsdom');

const { info, warn, error } = require('./log');
const { config } = require('./config');

const rollup = require('rollup');
const rollBabel = require('rollup-plugin-babel');
const rollResolve = require('rollup-plugin-node-resolve');
const rollVue = require('rollup-plugin-vue');
const rollReplace = require('rollup-plugin-replace');
const rollUglify = require('rollup-plugin-uglify');
let rollPlugins;

const postcss = require('postcss');
const precss = require('precss');
const unPrefix = require('postcss-unprefix');
const autoprefixer = require('autoprefixer');
const cssProcessor = postcss([precss, unPrefix, autoprefixer]);

const CleanCss = require('clean-css');
const cssCleaner = new CleanCss({
  format: {
    breaks: {
      // controls where to insert breaks
      afterAtRule: true, // controls if a line break comes after an at-rule; e.g. `@charset`; defaults to `false`
      afterBlockBegins: true, // controls if a line break comes after a block begins; e.g. `@media`; defaults to `false`
      afterBlockEnds: true, // controls if a line break comes after a block ends, defaults to `false`
      afterComment: true, // controls if a line break comes after a comment; defaults to `false`
      afterProperty: true, // controls if a line break comes after a property; defaults to `false`
      afterRuleBegins: true, // controls if a line break comes after a rule begins; defaults to `false`
      afterRuleEnds: true, // controls if a line break comes after a rule ends; defaults to `false`
      beforeBlockEnds: true, // controls if a line break comes before a block ends; defaults to `false`
      betweenSelectors: true // controls if a line break comes between selectors; defaults to `false`
    },
    spaces: {
      // controls where to insert spaces
      aroundSelectorRelation: true, // controls if spaces come around selector relations; e.g. `div > a`; defaults to `false`
      beforeBlockBegins: true, // controls if a space comes before a block begins; e.g. `.block {`; defaults to `false`
      beforeValue: true // controls if a space comes before a value; e.g. `width: 1rem`; defaults to `false`
    },
    indentBy: 2
  }
});

const tag = (+new Date()).toString(36);

async function copy(input, output) {
  info('[copy]', input, '->', output);
  copySync(input, output);
}

function insertVersion(filePath) {
  let version = config.bundle.version;
  if (version === false) return filePath;
  version = version === 'auto' ? tag : version;
  const fo = parse(filePath);
  return join(fo.dir, fo.name + '.' + version + fo.ext);
}

async function processScript(module, source, output) {
  info('[rollup]', 'source :', source);
  const { format, external, globals, sourcemap, } = config.bundle;
  this.scriptReference = output = insertVersion(output);
  output = join(config.outputRoot, output);
  let plugins = [
    rollVue({
      css: styles => {
        this.styles += styles;
      }
    })
  ].concat(rollPlugins);

  let bundle = await rollup.rollup({
    input: source,
    plugins,
    external
  });
  await bundle.write({
    name: module.$name,
    format: format || 'iife',
    file: output,
    sourcemap,
    globals
  });
  info('[rollup]', 'output :', output);
}

async function processCss(module, source, output) {
  source && info('[style]', 'source :', source);
  const styles = (source ? readFileSync(source).toString() : '') + this.styles;
  const { css, warnings } = await cssProcessor.process(styles, {
    from: source
  });
  for (let i = 0, len = warnings.length; i < len; i++) {
    warn(warnings[i].text);
  }
  this.cssReference = output = insertVersion(output || join(config.bundle.cssPath || '', module.$name + '.css'));
  output = join(config.outputRoot, output);
  mkdirsSync(parse(output).dir);
  writeFileSync(output, cssCleaner.minify(css).styles);
  info('[style]', 'output :', output);
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
      cssNode.setAttribute('type', 'text/css');
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
      //rollVue(),
      rollResolve(),
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
    if (config.bundle.uglify) {
      rollPlugins.push(rollUglify());
    }
  }
}

async function packOne(module) {
  try {
    info('[start]', 'module :', module.$name);
    const { script, css, page } = module;
    const context = { styles: '' };
    script && (await processScript.call(context, module, script.source, script.output));
    (css || context.styles)
      && (await processCss.call(context, module, css ? css.source : null, css ? css.output : null));
    page && (await processPage.call(context, module, page.source, page.output));
    for (let s in module) {
      if (['$name', '$watch', 'script', 'css', 'page'].indexOf(s) >= 0) continue;
      const { source, output } = module[s];
      await copy(source, join(config.outputRoot, output));
    }
    info('[completed]', 'module :', module.$name);
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
