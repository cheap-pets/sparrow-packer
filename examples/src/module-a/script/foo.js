import Vue from 'vue';
import Bar from './components/bar.vue';

(function() {
  return new Vue({
    el: '#foo',
    components: {
      'bar-component': Bar
    }
  });
})();
