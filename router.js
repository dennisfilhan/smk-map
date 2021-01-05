import Vue from 'vue'
import Router from 'vue-router'

// Pages
import Map from './Map'
import List from './List'

Vue.use(Router)

export default new Router({
  mode: 'history',

  routes: [
    { 
      path: '/', 
      component: Map
    },
    {
      path: '/list',
      component: List
    }
  ]
})