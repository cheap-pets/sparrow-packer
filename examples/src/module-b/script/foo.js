/*eslint-disable no-unused-vars */

import Vue from 'vue';
import Bar from './components/bar.vue';

/*eslint-enable no-unused-vars */

(function() {
  return new Vue({
    el: '#foo',
    render (h) {
      return (
        <Bar></Bar>
      )
    }
  });
})();
