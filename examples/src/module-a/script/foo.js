import { VTable } from 'vue-easytable'
import Bar from './components/bar.vue'

Vue.component(VTable.name, VTable)

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
