<template>
    <div class="fault-detection">
      <h1>故障检测</h1>
  
      <!-- 添加任务表单 -->
      <el-card class="task-form">
        <h2>添加任务</h2>
        <el-form :model="taskForm" label-width="120px">
          <el-form-item label="源类型">
            <el-radio-group v-model="taskForm.sourceType">
              <el-radio :label="0">文件上传</el-radio>
              <el-radio :label="1">URL</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="文件/URL">
            <el-upload
              v-if="taskForm.sourceType === 0"
              action="#"
              :auto-upload="false"
              :on-change="handleFileChange"
              :on-remove="handleRemove"
              :file-list="taskForm.files"
              multiple
            >
              <el-button type="primary">选择文件</el-button>
            </el-upload>
            <div v-else>
              <div v-for="(url, index) in taskForm.urls" :key="index">
                <el-input
                  v-model="taskForm.urls[index]"
                  placeholder="请输入URL"
                  style="margin-bottom: 10px;"
                >
                  <template #append>
                    <el-button @click="removeUrl(index)" :disabled="taskForm.urls.length === 1">
                      删除
                    </el-button>
                  </template>
                </el-input>
              </div>
              <el-button @click="addUrl" type="primary" style="margin-top: 10px;">添加URL</el-button>
              <el-button @click="fillDefaultUrls" type="primary" style="margin-top: 10px; margin-left: 10px;">
                填充默认URL
              </el-button>
            </div>
          </el-form-item>
          <el-form-item label="任务类型">
            <el-radio-group v-model="taskForm.taskType">
              <el-radio :label="1">可见光图片</el-radio>
              <el-radio :label="0">热成像图片</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="addTask" :loading="uploading">添加任务</el-button>
          </el-form-item>
        </el-form>
      </el-card>
  
      <!-- 任务列表 -->
      <el-card class="task-list">
        <h2>任务列表</h2>
        <el-table :data="tasks" style="width: 100%">
          <el-table-column prop="taskId" label="任务ID" width="180"></el-table-column>
          <el-table-column prop="statusText" label="状态" width="100"></el-table-column>
          <el-table-column prop="taskTypeText" label="任务类型" width="120"></el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="180"></el-table-column>
          <el-table-column label="操作">
            <template #default="scope">
              <el-button @click="getTaskResult(scope.row.taskId)" type="primary" size="small">查看结果</el-button>
              <el-button @click="deleteTask(scope.row.taskId)" type="danger" size="small">删除任务</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
  
      <!-- 任务结果展示 -->
      <el-dialog v-model="showResults" title="任务结果" width="80%">
        <el-carousel :interval="4000" type="card" height="400px">
          <el-carousel-item v-for="(item, index) in taskResults" :key="index">
            <el-card>
              <img :src="getImageUrl(item.url)" alt="Result Image" style="max-width: 100%; max-height: 300px;">
              <div>
                <h3>标签：</h3>
                <el-tag v-for="label in item.labels" :key="label" style="margin-right: 5px;">
                  {{ label }}
                </el-tag>
              </div>
            </el-card>
          </el-carousel-item>
        </el-carousel>
      </el-dialog>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, onUnmounted } from 'vue';
  import { ElMessage, ElUpload } from 'element-plus';
  import { faultDetectionApi } from '../api/index';

  const API_URL = 'https://cdxq.wkdkckdcx.cn:30443'; // 替换为实际的API基础URL

  const taskForm = ref({
    sourceType: 0,
    files: [],
    urls: [''],
    taskType: 1
  });

  const tasks = ref([]);
  const showResults = ref(false);
  const taskResults = ref([]);
  const uploading = ref(false);
  const uploadRef = ref(null);
  let statusUpdateInterval;

  const handleFileChange = (file, fileList) => {
    taskForm.value.files = fileList;
  };

  const handleRemove = (file, fileList) => {
    taskForm.value.files = fileList;
  };

  const addTask = async () => {
    try {
      uploading.value = true;
      const formData = new FormData();
      if (taskForm.value.sourceType === 0) {
        taskForm.value.files.forEach(file => {
          formData.append('files', file.raw);
        });
      } else {
        // 将URLs作为数组处理
        taskForm.value.urls.forEach(url => {
          if (url.trim()) {
            formData.append('urls', url.trim());
          }
        });
      }
      formData.append('source_type', taskForm.value.sourceType);
      formData.append('task_type', taskForm.value.taskType);

      console.log('发送的数据：', Object.fromEntries(formData));

      const response = await faultDetectionApi.addTask(formData);
      console.log('服务器响应：', response);

      if (response.data.code === 0) {
        ElMessage.success('任务添加成功');
        getTaskList();
        // 重置表单
        taskForm.value = {
          sourceType: 0,
          files: [],
          urls: [''],
          taskType: 1
        };
        // 清除上传组件的文件列表
        if (uploadRef.value) {
          uploadRef.value.clearFiles();
        }
      } else {
        ElMessage.error(response.data.msg || '添加任务失败');
      }
    } catch (error) {
      console.error('添加任务出错：', error);
      ElMessage.error('添加任务失败：' + (error.message || '未知错误'));
    } finally {
      uploading.value = false;
    }
  };

  const getTaskList = async () => {
    try {
      const response = await faultDetectionApi.getTaskList();
      if (response.data.code === 0) {
        tasks.value = response.data.data;
      } else {
        ElMessage.error(response.data.msg);
      }
    } catch (error) {
      ElMessage.error('获取任务列表失败');
    }
  };

  const updateTaskStatuses = async () => {
    for (let task of tasks.value) {
      if (task.statusCode !== 2 && task.statusCode !== 3) { // 不更新已完成或失败的任务
        try {
          const response = await faultDetectionApi.getTaskStatus(task.taskId);
          if (response.data.code === 0) {
            const updatedStatus = response.data.data;
            task.statusCode = updatedStatus.statusCode;
            task.statusText = updatedStatus.statusText;
          }
        } catch (error) {
          console.error(`更新任务 ${task.taskId} 状态失败:`, error);
        }
      }
    }
  };

  const getTaskResult = async (taskId) => {
    try {
      const response = await faultDetectionApi.getTaskResult(taskId, true);
      if (response.data.code === 0) {
        taskResults.value = response.data.data;
        showResults.value = true;
      } else {
        ElMessage.error(response.data.msg);
      }
    } catch (error) {
      ElMessage.error('获取任务结果失败');
    }
  };

  const deleteTask = async (taskId) => {
    try {
      const response = await faultDetectionApi.deleteTask(taskId);
      if (response.data.code === 0) {
        ElMessage.success('删除任务成功');
        getTaskList();
      } else {
        ElMessage.error(response.data.msg);
      }
    } catch (error) {
      ElMessage.error('删除任务失败');
    }
  };

  const getImageUrl = (url) => {
    return url.startsWith('http') ? url : `${API_URL}${url}`;
  };

  const addUrl = () => {
    taskForm.value.urls.push('');
  };

  const removeUrl = (index) => {
    taskForm.value.urls.splice(index, 1);
  };

  const fillDefaultUrls = () => {
    taskForm.value.urls = taskForm.value.taskType === 1 ? [...defaultVisibleLightUrls] : [...defaultInfraredUrls];
  };

  const defaultVisibleLightUrls = [
    'https://sarozs-bucket.oss-cn-hangzhou.aliyuncs.com/%E5%8F%AF%E8%A7%81%E5%85%89/DJI_20230628112023_0021_Z.JPG',
    'https://sarozs-bucket.oss-cn-hangzhou.aliyuncs.com/%E5%8F%AF%E8%A7%81%E5%85%89/DJI_20230628112042_0023_Z.JPG',
    'https://sarozs-bucket.oss-cn-hangzhou.aliyuncs.com/%E5%8F%AF%E8%A7%81%E5%85%89/DJI_20230703113342_0027_Z.JPG',
    'https://sarozs-bucket.oss-cn-hangzhou.aliyuncs.com/%E5%8F%AF%E8%A7%81%E5%85%89/DJI_20230703113443_0033_Z.JPG'
  ];

  const defaultInfraredUrls = [
    'https://sarozs-bucket.oss-cn-hangzhou.aliyuncs.com/%E7%BA%A2%E5%A4%96%E5%85%89/DJI_20230628111809_0008_T.JPG',
    'https://sarozs-bucket.oss-cn-hangzhou.aliyuncs.com/%E7%BA%A2%E5%A4%96%E5%85%89/DJI_20230703112952_0004_T.JPG',
    'https://sarozs-bucket.oss-cn-hangzhou.aliyuncs.com/%E7%BA%A2%E5%A4%96%E5%85%89/DJI_20230703113032_0008_T.JPG'
  ];

  onMounted(() => {
    getTaskList();
    statusUpdateInterval = setInterval(updateTaskStatuses, 10000); // 每10秒更新一次状态
  });

  onUnmounted(() => {
    if (statusUpdateInterval) {
      clearInterval(statusUpdateInterval);
    }
  });
</script>
  
  <style scoped>
  .fault-detection {
    padding: 20px;
  }

  .task-form,
  .task-list {
    margin-bottom: 20px;
  }

  .el-carousel__item {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .el-card {
    width: 100%;
    text-align: center;
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