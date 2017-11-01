/*eslint-disable no-unused-vars */

import Vue from 'vue';
import Bar from './components/bar.vue';

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
