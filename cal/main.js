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

  const bytes2  = CryptoJS.AES.decrypt(encryptedRoute, key);
  const str2 = bytes2.toString(CryptoJS.enc.Utf8)
  routes = JSON.parse(str2);
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
    if(location.href.includes('debug=1')) this.switchMode('map')
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
      const MAP_KEY = "F7WBZ-4NWHP-D6ZDH-LURHL-4P6ME-LUF46"

      const createMap =()=>{
        const map = new TMap.Map("map-container", {      
          zoom: 4.8,
          viewMode: '2D',
          showControl: false,
          center: new TMap.LatLng(33, 113)
        });

        const geometries = events.filter(e=>e.coord).map(e=>{
          const [lng,lat] = e.coord.split(',').map(n=>parseFloat(n))
          const properties = { 
              date: e.start,
              content: e.title,
              rank:e.rank||e.class.replace('text-length-5','').trim().length
            }
          return {
            position: new TMap.LatLng(lat, lng),
            content: properties.content,
            rank: properties.rank,
            properties
          }
        })

        routes.forEach(route=>{
          route.paths.forEach(path=>{
            if(path.polyline){
              display_polyline(path.polyline,path.color)
            }else{
              display_coords(path.coords,path.color)
            }
            
            if(!path.to.hidden){
              geometries.push({
                position: new TMap.LatLng(path.to.coord.split(',')[1], path.to.coord.split(',')[0]),
                content: path.to.name,
                properties:{                
                  content: path.to.name,
                  date: path.to.date,
                }
              })
            }
          })
        }) 

        const marker = new TMap.MultiMarker({
          map,
          geometries: geometries.map(g=>({position:g.position})),
          styles: {
            // 点标记样式
            default: new TMap.MarkerStyle({
              width: 15, // 样式宽
              height: 22, // 样式高
            }),
          },
        })

        const label = new TMap.MultiLabel({
          map,
          geometries,
          collisionOptions: {
            sameSource: true,
          },
          styles: {
            // 点标记样式
            default: new TMap.LabelStyle({
              wrapOptions:{},
              color: '#0000FF',
              strokeColor: '#FFFFFF',
              strokeWidth: 2,
              size:16,
              offset: { x: 0, y: 8 }, // 描点位置
            }),
          },
        })

        label.on('click',(evt)=>{
          const geometry = evt.geometry
          let content = geometry.content
          let rank
          if(content === geometry.properties.content){
            content = geometry.properties.content + "\n" + geometry.properties.date.substr(2)
            rank = 99
          }else{
            content = geometry.properties.content
            rank = geometry.properties.rank
          }
          geometry.content = content
          geometry.rank = rank
          label.updateGeometries([geometry])
        })

        function display_polyline(coords,color){
          
          //坐标解压（返回的点串坐标，通过前向差分进行压缩）
          var kr = 1000000;
          for (var i = 2; i < coords.length; i++) {
            coords[i] = Number(coords[i - 2]) + Number(coords[i]) / kr;
          }

          display_coords(coords,color)
        }
        
        function display_coords(coords,color){
          const pl = [];
          //将解压后的坐标放入点串数组pl中
          for (var i = 0; i < coords.length; i += 2) {
            pl.push(new TMap.LatLng(coords[i], coords[i+1]));
          }
          //创建 MultiPolyline显示折线
          var polylineLayer = new TMap.MultiPolyline({
            map: map,//绘制到目标地图
            //折线样式定义
            styles: {
              'default': new TMap.PolylineStyle({
                'color': ['#577833','#8C34B5','#3777FF','#EA1E63'][color-1], //线填充色
                // 'width': 6, //折线宽度
                showArrow: true,
              })
            },
            //折线数据定义
            geometries: [{'paths': pl}]
          });
        }
      }
      if(this.mapLoaded){
        return
      }
      //创建script标签，并设置src属性添加到body中
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src = `https://map.qq.com/api/gljs?v=1.exp&key=${MAP_KEY}`;
      script.onload = createMap;
      document.body.appendChild(script);
      this.mapLoaded = true
    }
  }
})