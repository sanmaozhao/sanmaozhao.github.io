let key = localStorage.getItem('lmCalKey')
if(!key){
  key = prompt('请输入数据密钥')
}

let events = [  {
  "start": "2023-09-27",
  "title": "密钥错误"
}]

try{
  const bytes  = CryptoJS.AES.decrypt(encryptedData, key);
  const str = bytes.toString(CryptoJS.enc.Utf8)
  events = JSON.parse(str);
  localStorage.setItem('lmCalKey',key)
}catch(e){}

Vue.use(vueTouchEvents,{
  swipeTolerance: 100,
})
var app = new Vue({
  el: '#app',
  components: { VueCal: vuecal },
  data: {
    selectedDate:events[events.length-1].start,
    events:events.map(e=>{
      if(!e.class) e.class="food"
      e.end = e.start
      return e
    })
  },
  methods:{
    swipeHandler(evt){
      if(evt === 'left'){
        this.$refs.cal.next()
      }else{
        this.$refs.cal.previous()
      }
    }
  }
})