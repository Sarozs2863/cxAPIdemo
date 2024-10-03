<template>
  <div class="cleaning-strategy">
    <h1>清洗策略</h1>
    
    <el-card class="control-panel">
      <div class="button-group">
        <el-button type="primary" @click="generateRandomData" :disabled="isCalculating">生成随机数据</el-button>
        <el-button type="success" @click="calculateCleaning" :loading="isCalculating" :disabled="form.stations.length === 0">计算最佳清洗方案</el-button>
      </div>
    </el-card>

    <el-card v-if="results.length > 0" class="results-card">
      <template #header>
        <div class="card-header">
          <span>计算结果</span>
        </div>
      </template>
      <el-table :data="results" style="width: 100%" :stripe="true" :border="true" :header-cell-style="{ background: '#f5f7fa', color: '#606266' }">
        <el-table-column prop="name" label="电站名称"  align="center"></el-table-column>
        <el-table-column label="最佳清洗时间" prop="best_clean"  align="center"></el-table-column>
        <el-table-column label="最佳清洗间隔"  align="center">
          <template #default="scope">
            {{ scope.row.best_gap }} 天
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card v-for="(station, stationIndex) in form.stations" :key="stationIndex" class="station-card">
      <template #header>
        <div class="card-header">
          <span>{{ station.name }}</span>
        </div>
      </template>
      <el-form :model="station" label-width="120px">
        <el-form-item label="电站数据">
          <el-table :data="station.data" style="width: 100%" :stripe="true" :border="true">
            <el-table-column label="日期" prop="date" width="180">
              <template #default="scope">
                {{ formatDate(scope.row.date) }}
              </template>
            </el-table-column>
            <el-table-column label="辐射量" prop="irradiation"></el-table-column>
            <el-table-column label="发电量(万kWh)" prop="powerGeneration"></el-table-column>
          </el-table>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { faultDetectionApi } from '../api/index'

const form = reactive({
  stations: []
})

const results = ref([])
const isCalculating = ref(false)

function generateRandomData() {
  const stationNames = ['阳光电站', '绿能电站', '蓝天电站', '太阳能源站', '光伏新城站']
  const stationCount = 5
  form.stations = []

  const endDate = new Date('2024-10-01')
  const startDate = new Date('2024-05-01') // 从5月1日开始，确保有足够的历史数据

  for (let i = 0; i < stationCount; i++) {
    const stationName = stationNames[i]
    const dataCount = Math.floor(Math.random() * 5) + 5 // 每个电站5到9条数据

    const stationData = []
    let currentDate = new Date(startDate)

    // 确保数据包含2024年10月1日
    stationData.push({
      date: new Date(endDate),
      irradiation: (Math.random() * 3 + 4).toFixed(1),
      powerGeneration: (Math.random() * 1 + 1).toFixed(2)
    })

    // 生成2024年10月1日之前的数据
    while (stationData.length < dataCount) {
      currentDate = new Date(currentDate.getTime() + (Math.floor(Math.random() * 10) + 5) * 24 * 60 * 60 * 1000) // 每5到14天一条数据
      if (currentDate >= endDate) break
      stationData.push({
        date: new Date(currentDate),
        irradiation: (Math.random() * 3 + 4).toFixed(1),
        powerGeneration: (Math.random() * 1 + 1).toFixed(2)
      })
    }

    // 按日期排序
    stationData.sort((a, b) => a.date - b.date)

    form.stations.push({
      name: stationName,
      data: stationData
    })
  }

  ElMessage.success('已生成随机数据')
}

async function calculateCleaning() {
  if (form.stations.length === 0) {
    ElMessage.error('请先生成随机数据')
    return
  }

  for (const station of form.stations) {
    if (station.data.length === 0) {
      ElMessage.error(`请填写 ${station.name} 的完整数据`)
      return
    }
  }

  isCalculating.value = true

  try {
    const requestData = {
      stations: form.stations.map(station => ({
        name: station.name,
        data: station.data.map(item => ({
          date: item.date.toISOString().split('T')[0],
          irradiation: parseFloat(item.irradiation),
          power_generation: parseFloat(item.powerGeneration)
        }))
      }))
    }

    const response = await faultDetectionApi.calculateBestCleaning(requestData)

    if (response.data.code === 0) {
      results.value = response.data.data
      ElMessage.success('计算成功')
    } else {
      ElMessage.error(response.data.msg || '计算失败')
    }
  } catch (error) {
    console.error('API调用失败:', error)
    ElMessage.error('API调用失败，请检查网络连接')
  } finally {
    isCalculating.value = false
  }
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.cleaning-strategy {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.control-panel {
  margin-bottom: 20px;
}

.button-group {
  display: flex;
  justify-content: space-between;
}

.results-card {
  margin-bottom: 20px;
}

.station-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h1 {
  text-align: center;
  margin-bottom: 20px;
  color: #409EFF;
}

.el-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.el-card__header {
  background-color: #f5f7fa;
  font-weight: bold;
}

.el-table {
  margin-top: 10px;
}

.results-card .el-table {
  margin-top: 0;
}

.results-card .el-table th {
  font-weight: bold;
}

.results-card .el-table td,
.results-card .el-table th {
  padding: 12px 0;
}

.results-card .el-table--striped .el-table__body tr.el-table__row--striped td {
  background-color: #fafafa;
}

.results-card .el-table__header-wrapper {
  background-color: #f5f7fa;
}

.results-card .el-table__header-wrapper th {
  background-color: #f5f7fa !important;
}

h1 {
  color: var(--primary-color);
  text-align: center;
  margin-bottom: 30px;
}

.el-card {
  margin-bottom: 20px;
}

.el-form-item {
  margin-bottom: 20px;
}

.el-button {
  margin-right: 10px;
}

@media (max-width: 768px) {
  .el-form-item {
    margin-bottom: 15px;
  }
}
</style>