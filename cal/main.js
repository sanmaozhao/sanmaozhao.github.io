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
}catch(e){
  localStorage.removeItem('lmCalKey')
}

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
          zoom: 4.9,
          viewMode: '2D',
          showControl: false,
          center: new TMap.LatLng(33, 113)
        });

        const geometries = events.filter(e=>e.coord).map(e=>{
          let [lng,lat] = e.coord.split(',').map(n=>parseFloat(n))
          if(lng<lat){
            [lng,lat] = [lat,lng]
          }
          const properties = { 
              date: e.start,
              content: e.title,
              styleId: e.class.startsWith('food')?'food':'default',
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
                rank:10,
                properties:{                
                  content: path.to.name,
                  date: path.to.date,
                  rank:10,
                }
              })
            }
          })
        }) 

        // 创建点聚合实例
        const markerCluster = new TMap.MarkerCluster({
          id: 'cluster',
          enableDefaultStyle: false,
          gridSize:30,
          maxZoom:18,
          map: map,
          geometries:geometries, // 点标记数据
        });
        
        var marker,marker2 = null;
        //初始化infoWindow
        var infoWindow = new TMap.InfoWindow({
          map: map,
          position: new TMap.LatLng(39.984104, 116.307503),
          offset: { x: 0, y: -12 } //设置信息窗相对position偏移像素
        });
        infoWindow.close();//初始关闭信息窗关闭

        // 监听聚合簇变化
        markerCluster.on('cluster_changed', function (e) {
          var clusterBubbleList = [];
          var markerGeometries = [];
          infoWindow.close()

          // 根据新的聚合簇数组生成新的覆盖物和点标记图层
          var clusters = markerCluster.getClusters();
   
          clusters.forEach(function (item) {
            if (item.geometries.length > 1) {
              // 找到 geometries 数组中rank最大的元素
              const maxRankGeometry = item.geometries.reduce((max, geometry) => {
                return geometry.rank > max.rank ? geometry : max;
              }, item.geometries[0]);

              clusterBubbleList.push({
                position: item.center,
                content: maxRankGeometry.content,                
                properties: { 
                  count: item.geometries.length,
                  styleId:maxRankGeometry.properties.styleId,
                  bounds: item.bounds,
                }
              })
            } else {
              markerGeometries.push(item.geometries[0]);
            }
          });
          
          const allMarker = clusterBubbleList.concat(markerGeometries).map(item=>{
            item.styleId = item.properties.styleId
            return item
          });

          if (marker) {
            // 已创建过点标记图层，直接更新数据
            marker.setGeometries(allMarker);
          } else {
            // 创建点标记图层
            marker = new TMap.MultiLabel({
              map,
              collisionOptions: {
                // sameSource: true,
              },
              styles: {
                // 点标记样式
                default: new TMap.LabelStyle({
                  wrapOptions:{},
                  color: '#0000FF',
                  strokeColor: '#FFFFFF',
                  strokeWidth: 3,
                  size:16,
                }),
                food: new TMap.LabelStyle({
                  wrapOptions:{},
                  color: '#800080',
                  strokeColor: '#FFFFFF',
                  strokeWidth: 3,
                  size:16,
                })
              },
              geometries: allMarker
            });
          }

          const markerForCluster = clusterBubbleList.map(item=>{
            return {
              position: item.position,
              content:item.properties.count > 9?'+':item.properties.count.toString(),
              properties: item.properties
            }
          })
          
          if (marker2) {
            // 已创建过点标记图层，直接更新数据
            marker2.setGeometries(markerForCluster);
          } else {
            // 创建点标记图层
            marker2 = new TMap.MultiLabel({
              map,
              styles: {
                // 点标记样式
                default: new TMap.LabelStyle({
                  color: '#FFFFFF',
                  backgroundColor:"#F24E4E",
                  width:14,
                  height:14,
                  borderRadius: 8,
                  size:12,
                  offset: { x: 0, y: 15 }, 
                })
              },
              geometries: markerForCluster
            });
 
            const clickToZoom = (evt)=>{
              const geometry = evt.geometry
              if(geometry.properties?.bounds){
                map.fitBounds(new TMap.LatLngBounds(geometry.properties.bounds._sw,geometry.properties.bounds._ne))
              }else{
                //设置infoWindow
                infoWindow.open(); //打开信息窗
                infoWindow.setPosition(evt.geometry.position);//设置信息窗位置
                infoWindow.setContent(evt.geometry.properties.date);//设置信息窗内容
              }
            }

            marker.on('click',clickToZoom)
            marker2.on('click',clickToZoom)
          }
        });

 
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
                // 'width': 4, //折线宽度
                showArrow: true,
                arrowOptions:{
                  height:8,
                  animSpeed:10,
                },
              })
            },
            zIndex:99,
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