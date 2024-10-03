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

        <el-form-item label="路径点">
          <div class="route-points-container">
            <div v-for="(point, index) in form.route" :key="index" class="point-input">
              <el-input
                v-model="form.route[index]"
                placeholder="经度,纬度,高度"
              >
                <template #append>
                  <el-button @click="removePoint(index)" :disabled="form.route.length === 1" type="danger">删除</el-button>
                </template>
              </el-input>
            </div>
          </div>
          <div class="route-buttons">
            <el-button @click="addPoint" type="primary">添加路径点</el-button>
            <el-button @click="fillDefaultPoints" type="info">填充默认路径点</el-button>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="success" @click="submitForm">提交</el-button>
        </el-form-item>
      </el-form>
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

    <el-card class="map-card">
      <div id="mapContainer" style="height: 400px;"></div>
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
  route: ['']
})

const originalWaypoints = ref([])
const newWaypoints = ref([])

const defaultPoints = [
  '102.520837917991,25.4405945326583,2335.0',
  '102.521462857153,25.4405846811935,2330.5',
  '102.520687618858,25.4408916896165,2343.5',
  '102.520554539132,25.4409443910344,2343.99309443843'
]

const handleFileChange = (file) => {
  if (file && file.raw) {
    form.value.kmzFile = file.raw
    console.log('File object:', file.raw)
  } else {
    console.error('Invalid file object:', file)
  }
}

const addPoint = () => {
  form.value.route.push('')
}

const removePoint = (index) => {
  form.value.route.splice(index, 1)
}

const fillDefaultPoints = () => {
  form.value.route = [...defaultPoints]
  renderRouteOnMap()
}

const submitForm = async () => {
  if (!form.value.kmzFile) {
    ElMessage.error('请选择KMZ文件')
    return
  }
  if (form.value.route.length === 0 || form.value.route.some(point => !point.trim())) {
    ElMessage.error('请输入至少一个有效的路径点')
    return
  }

  try {
    const formData = new FormData()
    formData.append('kmz_file', form.value.kmzFile)

    // 解析路径点字符串为JSON格式
    const routePoints = form.value.route.map(point => {
      const [longitude, latitude, altitude] = point.split(',').map(Number)
      return [longitude, latitude, altitude]
    })
    formData.append('route', JSON.stringify(routePoints))

    console.log('FormData entries:')
    for (let [key, value] of formData.entries()) {
      console.log(key, value)
    }

    // 获取原始KMZ文件的航点
    const originalWaypointsResponse = await faultDetectionApi.getAllWaypoints(formData)
    if (originalWaypointsResponse.data.code === 0) {
      originalWaypoints.value = originalWaypointsResponse.data.data.waypoints
    }

    // 提交新路径
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
    }

    renderRouteOnMap()

    ElMessage.success('新的KMZ文件已生成并下载，地图已更新')
  } catch (error) {
    console.error('Error:', error)
    ElMessage.error('提交失败，请重试')
  }
}

const map = ref(null)

onMounted(() => {
  initMap()
})

const initMap = async () => {
  try {
    const AMap = await AMapLoader.load({
      key: '5f4cb0c169a6a27e32e76364150becf4',
      version: '2.0',
      plugins: ['AMap.Polyline', 'AMap.Marker']
    })

    map.value = new AMap.Map('mapContainer', {
      zoom: 13,
      center: [102.520837917991, 25.4405945326583] // 默认中心点，可以根据需要调整
    })
  } catch (e) {
    console.error('地图加载失败', e)
  }
}

const renderRouteOnMap = () => {
  if (!map.value) return

  const path = form.value.route.map(point => {
    const [longitude, latitude] = point.split(',').map(Number)
    return [longitude, latitude]
  })

  // 清除现有的覆盖物
  map.value.clearMap()

  // 添加标记
  path.forEach((position, index) => {
    const marker = new AMap.Marker({
      position: position,
      label: {
        content: `点 ${index + 1}`,
        direction: 'top'
      }
    })
    map.value.add(marker)
  })

  // 添加连线
  const polyline = new AMap.Polyline({
    path: path,
    strokeColor: '#3366FF',
    strokeWeight: 5,
    strokeOpacity: 0.8
  })
  map.value.add(polyline)

  // 调整视图以包含所有点
  map.value.setFitView()
}
</script>

<style scoped>
.route-planning {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  color: var(--primary-color);
  text-align: center;
  margin-bottom: 30px;
}

.route-planning-card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

.route-points-container {
  max-height: 300px;
  overflow-y: auto;
  border-radius: 4px;
  margin-bottom: 10px;
}

.point-input {
  margin-bottom: 10px;
}

.route-buttons {
  margin-left: 20px;
  display: flex;
  justify-content: flex-start;
  align-self: start;
}

.el-form-item {
  margin-bottom: 20px;
}

.el-button {
  margin-right: 10px;
}

@media (max-width: 768px) {
  .route-planning {
    padding: 10px;
  }

  .el-form-item {
    margin-bottom: 15px;
  }
}

.waypoints-card {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.el-table {
  margin-top: 20px;
}

.map-card {
  margin-top: 20px;
}
</style>