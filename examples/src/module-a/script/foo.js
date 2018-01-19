/* eslint-disable no-unused-vars */

import Bar from './components/bar.vue'

/* eslint-enable no-unused-vars */

;(function () {
  let arr = [1, 2, 3]
  if (arr.indexOf(1)) {
    console.log('ok')
  }
  return new Vue({
    el: '#foo',
    components: {
      'cmp-bar': Bar
    }
  })
})()
