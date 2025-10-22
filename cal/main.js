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
})

events = events.map(e=>{
  if(!e.class) e.class="food"
  e.end = e.start
  return e
})

const eventsStat = {}
events.forEach(event=>{
  const type = event.class.split(" ")[0]

  if(!eventsStat[type]) eventsStat[type] ={}

  const title = event.title||'s'
  if(!eventsStat[type][title]){
    eventsStat[type][title] ={
      count:1,
      dates:[event.start]
    }
  }else{
    eventsStat[type][title].count ++
    eventsStat[type][title].dates.push(event.start)
  }
})

events.forEach(event=> {
  event.title= (event.title||'') + (event.subTitle||'')
  if(event.title.length === 5 && /^[\u4e00-\u9fa5]+$/.test(event.title)){
    event.class += ' text-length-5'
  }
})

const eventsStatArr = {}
for (let [key, value] of Object.entries(eventsStat)) {

  const events = []
  for (let [name, event] of Object.entries(value)) {
    events.push({
      name,
      count:event.count,
      dates:event.dates
    })
  }
  eventsStatArr[key] = events.sort((a,b)=>b.count - a.count)
}

var app = new Vue({
  el: '#app',
  components: { VueCal: vuecal },
  data: {
    selectedDate:events[events.length-1].start,
    maxDate:events[events.length-1].start,
    minDate:events[0].start,
    events,
    mode:'cal',
    eventsStatArr,
    selectedTab:'food',
    eventsStatIndex:0,
    searchText:'',
    sheetVisible:false,
    mapLoaded:false,
  },
  created(){
    // this.switchMode('map')
  },
  computed:{
    eventsStatDates(){
      return this.eventsStatArr[this.selectedTab][this.eventsStatIndex].dates.map(d=>{
        return {
          name:d + ' ' + '日一二三四五六'.charAt(new Date(d).getDay()),
          date:d,
          method:this.gotoDate
        }
      })
    },
    searchResult(){
      if(!this.searchText) return []
      return this.events.filter(e=>{
        return e.title?.includes(this.searchText) || e.subTitle?.includes(this.searchText)
      }).map(e=>{
        return {
          dateText:e.start + ' ' + '日一二三四五六'.charAt(new Date(e.start).getDay()),
          ...e
        }
      })
    },
  },
  methods:{
    swipeHandler(evt){
      if(evt === 'left'){
        this.$refs.cal.next()
      }else if(evt === 'right'){
        this.$refs.cal.previous()
      }
    },
    switchMode(mode){
      this.mode = mode
      if(mode==='map'){
        this.loadMap()
      }
    },
    gotoDate(item){
      this.sheetVisible = false
      this.selectedDate = item.date
      this.mode = 'cal'
    },
    onEventClick(evt){
      const type = evt.class.split(" ")[0]
      this.eventsStatIndex = this.eventsStatArr[type].findIndex(e=>{
        return evt.title.startsWith(e.name)
      })
      this.selectedTab = type
      setTimeout(()=>this.sheetVisible = true,10)
    },
    loadMap(){

      const createMap =()=>{
        const map = new TMap.Map("map-container", {      
          zoom: 5,
          center: new TMap.LatLng(34.80, 112.00)
        });

        const geometries = events.filter(e=>e.coord).map(e=>{
        const [lng,lat] = e.coord.split(',').map(n=>parseFloat(n))
          return {
            position: new TMap.LatLng(lat, lng),
            content: e.title,
            properties: { 
              date: e.start,
              content: e.title,
            }
          }
        })

          // 创建点聚合实例
        const markerCluster = new TMap.MarkerCluster({
          id: 'cluster',
          enableDefaultStyle: true,
          gridSize:5,
          map: map,
          geometries, // 点标记数据
        });

        var clusterBubbleList = [];
        var markerGeometries = [];
        var marker = null;

        // 监听聚合簇变化
        markerCluster.on('cluster_changed', function (e) {
          markerGeometries = [];

          // 根据新的聚合簇数组生成新的覆盖物和点标记图层
          var clusters = markerCluster.getClusters();
          clusters.forEach(function (item) {
            if (item.geometries.length > 1) {

            } else {
              markerGeometries.push({
                position: item.center,
                content: item.geometries[0].content,
                properties: { 
                  ...item.geometries[0].properties
                }
              });
            }
          });

          if (marker) {
            // 已创建过点标记图层，直接更新数据
            marker.setGeometries(markerGeometries);
          } else {
            // 创建点标记图层
            marker = new TMap.MultiLabel({
              map,
              // collisionOptions: {
              //   sameSource: true,
              // },
              styles: {
                default: new TMap.LabelStyle({
                  color: '#3777FF', // 颜色属性
                  offset: { x: -8, y: 2 }, // 文字偏移属性单位为像素
                  alignment: 'center', // 文字水平对齐属性
                  verticalAlignment: 'middle', // 文字垂直对齐属性
                }),
              },
              geometries: markerGeometries
            });
            marker.on('click',(evt)=>{
              const geometry = evt.geometry
              let content = geometry.content
              if(content === geometry.properties.content){
                content = geometry.properties.content + " " + geometry.properties.date.substr(2)
              }else{
                content = geometry.properties.content
              }
              geometry.content = content
              marker.updateGeometries([geometry])
            })
          }
        });

      }
      if(this.mapLoaded){
        return
      }
      //创建script标签，并设置src属性添加到body中
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src = "https://map.qq.com/api/gljs?v=1.exp&key=F7WBZ-4NWHP-D6ZDH-LURHL-4P6ME-LUF46&callback=";
      script.onload = createMap;
      document.body.appendChild(script);
      this.mapLoaded = true
    }
  }
})