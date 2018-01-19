# sparrow-packer

web frone-end content pack tool, support multi-pages web app

powered by rollup & postcss



## Installation

need javascript APIs:

```shell
npm i sparrow-packer
```

or take "-g" option to use the CLI tool

```shell
npm i sparrow-packer -g
```



## CLI

run  command in the source directory or the project directory that include "src" directory，this tool will try to find the source directory

```shell
localhost:src scrollbar$ sprpack
localhost:project-dir scrollbar$ sprpack
```

specify the source directory or the project directory

```shell
localhost:any-path scrollbar$ sprpack /Users/user-name/code/project-dir/src
localhost:any-path scrollbar$ sprpack /Users/user-name/code/project-dir
```

specify both the source directory and the target directory

```shell
localhost:any-path scrollbar$ sprpack /Users/user-name/code/project-dir/src /Users/user-name/code/project-dir/dist
```

specify relative directory

```shell
localhost:project-dir scrollbar$ sprpack src dist
```

specify a page

```shell
localhost:project-dir scrollbar$ sprpack src/index.html dist/index.html
```

specify a script entry

```shell
localhost:project-dir scrollbar$ sprpack src/index.js dist/app.js
```

specify a (post)css entry

```shell
localhost:project-dir scrollbar$ sprpack src/css/index.pcss dist/css/app.css
```

clean target directory

```shell
localhost:project-dir scrollbar$ sprpack src dist -c(lean)
```

pack and watch file changes

```shell
localhost:project-dir scrollbar$ sprpack src dist -w(atch)
```



## Javascript APIs

```javascript
const { join } = require('path')
const { pack } = require('../src')

const src = join(__dirname, 'src')
const dist = join(__dirname, 'dist')

pack(src, dist, {
  clean: true,
  watch: true,
  format: 'iife', // rollup module format, 'iife' by default
  uglify: true, // false by default,
  sourcemap: true // false by default
})
```

