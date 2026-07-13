# 每日自学打卡网站

一个给中学生使用的纯前端每日自学任务管理网站。学生可以查看当天任务、完成打卡、查看日历和统计；管理者可以在本地添加、编辑、删除、复制任务，并通过 JSON 文件导入导出数据。

## 功能介绍

- 学生首页：当前日期、问候语、鼓励语、连续打卡天数、今日统计和完成进度。
- 今日任务：支持全部、未完成、已完成筛选；支持完成打卡和取消完成。
- 学习日历：按月查看每天任务状态，点击日期查看当天任务。
- 学习统计：展示本周、本月、连续完成、历史完成、科目分布和最近七天完成情况。
- 任务管理：本地密码入口，支持单个添加、批量添加、编辑、删除、复制某天任务到另一天。
- 数据导入导出：导出完整 JSON，导入时可选择覆盖或合并，并提供示例模板下载。
- 个性设置：学生姓名、每日目标、管理密码、完成动画、预计时间显示、深色模式。

## 技术栈

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide React
- localStorage

## 安装方法

```bash
npm install
```

## 启动方法

```bash
npm run dev
```

启动后根据终端提示打开本地地址，通常是 `http://localhost:5173`。

## 打包方法

```bash
npm run build
```

构建产物会生成在 `dist/` 目录。

## localStorage 数据说明

本项目没有后端，所有任务和设置都保存在当前浏览器的 localStorage 中。

- 任务数据 key：`self-study-tasks`
- 设置数据 key：`self-study-settings`

刷新浏览器不会丢失数据，但清理浏览器数据、更换浏览器或更换设备后不会自动同步。

## JSON 导入导出方法

进入“任务管理”页面，输入本地管理密码后可以：

- 点击“导出任务数据”下载完整 JSON 文件。
- 点击“导入任务数据”选择 JSON 文件，并选择覆盖或合并。
- 点击“下载示例模板”获取可参考的数据格式。

本项目没有后端，不同设备之间不会自动同步。需要通过导出 JSON 和导入 JSON 的方式传递任务数据。

## 无后端项目的限制

- 数据只存在当前浏览器，不能自动同步到其他设备。
- 管理密码只用于隐藏本地管理入口，不是真正的安全登录。
- 清除浏览器缓存或 localStorage 会删除任务和设置。
- 多人同时编辑无法自动合并，需要人工导出和导入 JSON。

## 如何修改默认管理密码

默认管理密码是 `123456`。你可以在“个性设置”页面中修改，也可以直接修改：

```ts
// src/utils/storage.ts
adminPassword: "123456"
```

## 部署到 GitHub Pages、Vercel 或 Netlify

### GitHub Pages

项目可使用 `gh-pages` 分支部署，这种方式不需要后端服务。

1. 执行 `npm run build`。
2. 将 `dist/` 目录内容推送到仓库的 `gh-pages` 分支。
3. 进入仓库 `Settings` → `Pages`。
4. 在 `Build and deployment` 中选择 `Deploy from a branch`。
5. 分支选择 `gh-pages`，目录选择 `/ (root)`。
6. 部署地址通常是 `https://你的用户名.github.io/仓库名/`。

`vite.config.ts` 已配置 `base: "./"`，适合部署到 GitHub Pages 的子路径。

### Vercel

1. 将项目推送到 GitHub。
2. 在 Vercel 新建项目并选择该仓库。
3. 构建命令填写 `npm run build`，输出目录填写 `dist`。

### Netlify

1. 将项目推送到 GitHub。
2. 在 Netlify 新建站点并选择该仓库。
3. 构建命令填写 `npm run build`，发布目录填写 `dist`。

部署后仍然是纯前端项目，任务数据依然保存在访问者自己的浏览器 localStorage 中。
