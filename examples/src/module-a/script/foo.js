import Bar from './components/bar.vue'

function init () {
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
}

init()
