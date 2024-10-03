<template>
  <div class="route-planning">
    <h1>路径规划</h1>
    
    <el-card class="route-planning-card">
      <el-form :model="form" label-width="120px">
        <el-form-item label="KMZ文件">
          <el-upload
            class="upload-demo"
            action="#"
            :auto-upload="false"
            :on-change="handleFileChange"
            :limit="1"
          >
            <el-button type="primary">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">请上传KMZ文件</div>
            </template>
          </el-upload>
          <div v-if="form.kmzFile">
            已选择文件: {{ form.kmzFile.name }}
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="loadOriginalWaypoints">加载原始航点</el-button>
          <el-button type="success" @click="submitForm">提交</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="map-card">
      <template #header>
        <div class="card-header">
          <span>原始路径</span>
        </div>
      </template>
      <div id="originalMapContainer" class="map-container"></div>
    </el-card>

    <el-card class="map-card">
      <template #header>
        <div class="card-header">
          <span>新路径</span>
        </div>
      </template>
      <div id="newMapContainer" class="map-container"></div>
    </el-card>

    <el-card v-if="originalWaypoints.length > 0" class="waypoints-card">
      <template #header>
        <div class="card-header">
          <span>原始KMZ文件航点</span>
        </div>
      </template>
      <el-table :data="originalWaypoints" height="400" style="width: 100%">
        <el-table-column prop="0" label="经度" width="180"></el-table-column>
        <el-table-column prop="1" label="纬度" width="180"></el-table-column>
        <el-table-column prop="2" label="高度"></el-table-column>
      </el-table>
    </el-card>

    <el-card v-if="newWaypoints.length > 0" class="waypoints-card">
      <template #header>
        <div class="card-header">
          <span>新KMZ文件航点</span>
        </div>
      </template>
      <el-table :data="newWaypoints" height="400" style="width: 100%">
        <el-table-column prop="0" label="经度" width="180"></el-table-column>
        <el-table-column prop="1" label="纬度" width="180"></el-table-column>
        <el-table-column prop="2" label="高度"></el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { faultDetectionApi } from '../api/index'
import AMapLoader from '@amap/amap-jsapi-loader'

const form = ref({
  kmzFile: null,
})

const originalWaypoints = ref([])
const selectedWaypoints = ref([])
const newWaypoints = ref([])

const originalMap = ref(null)
const newMap = ref(null)

onMounted(() => {
  initMaps()
})

const initMaps = async () => {
  try {
    const AMap = await AMapLoader.load({
      key: '5f4cb0c169a6a27e32e76364150becf4',
      version: '2.0',
      plugins: ['AMap.Polyline', 'AMap.Marker']
    })

    originalMap.value = new AMap.Map('originalMapContainer', {
      zoom: 13,
      center: [102.520837917991, 25.4405945326583]
    })

    newMap.value = new AMap.Map('newMapContainer', {
      zoom: 13,
      center: [102.520837917991, 25.4405945326583]
    })
  } catch (e) {
    console.error('地图加载失败', e)
  }
}

const handleFileChange = (file) => {
  if (file && file.raw) {
    form.value.kmzFile = file.raw
    console.log('File object:', file.raw)
  } else {
    console.error('Invalid file object:', file)
  }
}

const loadOriginalWaypoints = async () => {
  if (!form.value.kmzFile) {
    ElMessage.error('请先选择KMZ文件')
    return
  }

  try {
    const formData = new FormData()
    formData.append('kmz_file', form.value.kmzFile)

    const response = await faultDetectionApi.getAllWaypoints(formData)
    if (response.data.code === 0) {
      originalWaypoints.value = response.data.data.waypoints
      renderRouteOnMap(originalMap.value, originalWaypoints.value, '#FF0000', true)
      ElMessage.success('原始航点加载成功')
    } else {
      ElMessage.error('加载原始航点失败')
    }
  } catch (error) {
    console.error('Error:', error)
    ElMessage.error('加载原始航点失败')
  }
}

const renderRouteOnMap = (map, waypoints, color = 'blue', selectable = false) => {
  if (!map) return

  const path = waypoints.map(point => [point[0], point[1]])

  // 清除现有的覆盖物
  map.clearMap()

  // 添加标记
  path.forEach((position, index) => {
    const marker = new AMap.Marker({
      position: position,
      label: {
        content: `点 ${index + 1}`,
        direction: 'top'
      }
    })
    map.add(marker)

    if (selectable) {
      marker.on('click', () => {
        toggleWaypointSelection(index, marker)
      })
    }
  })

  // 添加连线
  const polyline = new AMap.Polyline({
    path: path,
    strokeColor: 'blue',
    strokeWeight: 5,
    strokeOpacity: 0.8
  })
  map.add(polyline)

  // 调整视图以包含所有点
  map.setFitView()
}

const toggleWaypointSelection = (index, marker) => {
  const waypoint = originalWaypoints.value[index]
  const existingIndex = selectedWaypoints.value.findIndex(wp => wp[0] === waypoint[0] && wp[1] === waypoint[1])
  
  if (existingIndex === -1) {
    selectedWaypoints.value.push(waypoint)
    marker.setIcon(new AMap.Icon({
      size: new AMap.Size(25, 34),
      image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png'
    }))
  } else {
    selectedWaypoints.value.splice(existingIndex, 1)
    marker.setIcon(new AMap.Icon({
      size: new AMap.Size(25, 34),
      image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png'
    }))
  }
}

const submitForm = async () => {
  if (!form.value.kmzFile) {
    ElMessage.error('请选择KMZ文件')
    return
  }
  if (selectedWaypoints.value.length === 0) {
    ElMessage.error('请选择至少一个航点')
    return
  }

  try {
    const formData = new FormData()
    formData.append('kmz_file', form.value.kmzFile)
    formData.append('route', JSON.stringify(selectedWaypoints.value))

    const response = await faultDetectionApi.submitRoute(formData)

    // 创建一个Blob对象并生成下载链接
    const blob = new Blob([response.data], { type: 'application/vnd.google-earth.kmz' })
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = 'new_route.kmz'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // 获取新KMZ文件的航点
    const newFormData = new FormData()
    newFormData.append('kmz_file', new File([blob], 'new_route.kmz'))
    const newWaypointsResponse = await faultDetectionApi.getAllWaypoints(newFormData)
    if (newWaypointsResponse.data.code === 0) {
      newWaypoints.value = newWaypointsResponse.data.data.waypoints
      renderRouteOnMap(newMap.value, newWaypoints.value, '#00FF00')
      ElMessage.success('新的KMZ文件已生成并下载，地图和表格已更新')
    } else {
      ElMessage.error('获取新航点失败')
    }
  } catch (error) {
    console.error('Error:', error)
    ElMessage.error('提交失败，请重试')
  }
}
</script>

<style scoped>
.route-planning {
  padding: 20px;
}

.route-planning-card,
.map-card,
.waypoints-card {
  margin-bottom: 20px;
}

.map-container {
  height: 600px;
  width: 100%;
}

.el-form-item {
  margin-bottom: 20px;
}

.el-button {
  margin-right: 10px;
}

.el-table {
  margin-top: 20px;
}
</style>