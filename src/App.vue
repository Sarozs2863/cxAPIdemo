<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <el-menu mode="horizontal" router class="app-menu">
        <el-menu-item index="/fault-detection">故障检测</el-menu-item>
        <el-menu-item index="/route-planning">路径规划</el-menu-item>
        <el-menu-item index="/cleaning-strategy">清洗策略</el-menu-item>
      </el-menu>
    </el-header>
    <el-main class="app-main">
      <div class="container">
        <router-view></router-view>
      </div>
    </el-main>
  </el-container>
</template>

<script setup>
import { ElContainer, ElHeader, ElMain, ElMenu, ElMenuItem } from 'element-plus'
</script>

<style>
.app-container {
  min-height: 100vh;
}

.app-header {
  background-color: var(--primary-color);
  padding: 0;
}

.app-menu {
  background-color: transparent;
}

.el-menu--horizontal > .el-menu-item {
  color: white;
}

.el-menu--horizontal > .el-menu-item.is-active {
  color: #ffd04b;
  border-bottom-color: #ffd04b;
}

.app-main {
  padding-top: 20px;
}
</style>