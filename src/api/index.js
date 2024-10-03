// src/api/faultDetection.js
import axios from 'axios';

const API_URL = 'https://cdxq.wkdkckdcx.cn:30443'; // 替换为实际的API基础URL

export const faultDetectionApi = {
  addTask(formData) {
    return axios.post(`${API_URL}/detect/add_task`, formData);
  },

  getTaskStatus(taskId) {
    return axios.get(`${API_URL}/detect/task_status`, { params: { task_id: taskId } });
  },

  getTaskList() {
    return axios.get(`${API_URL}/detect/task_list`);
  },

  getTaskResult(taskId, isUrl) {
    return axios.get(`${API_URL}/detect/task_result`, { 
      params: { task_id: taskId, is_url: isUrl },
      responseType: isUrl ? 'json' : 'blob'
    });
  },

  deleteTask(taskId) {
    return axios.get(`${API_URL}/detect/delete_task`, { params: { task_id: taskId } });
  },

  submitRoute(formData) {
    return axios.post(`${API_URL}/UAV/route/new`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      responseType: 'blob'
    });
  },

  calculateBestCleaning(data) {
    return axios.post(`${API_URL}/wash/calculate_best_cleaning`,data,{
      headers:{
        'Content-Type':'application/json'
      }
    });
  },

  getAllWaypoints(formData) {
    return axios.post(`${API_URL}/UAV/get_all_waypoints`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};