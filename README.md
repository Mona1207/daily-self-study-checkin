# 今日清单

把每天要做的事，清楚地安排好。

今日清单是一款通用的每日任务 App，适合学生、上班族和普通个人使用。应用不需要注册登录，不使用后端，核心数据默认只保存在当前设备，并支持离线使用。

## 功能

- 今天：查看当天任务、快速添加、完成打卡、撤销完成、延期、专注计时、完成记录、每日回顾。
- 日历：按月查看过去和未来日期的任务，并可为选中日期添加任务。
- 统计：查看今日完成率、本周完成任务和各分类专注时长。
- 我的：分类管理、周期任务、提醒偏好、外观设置、JSON 导入导出、完整 ZIP 备份、版本更新。
- 本地数据：结构化数据保存在 localStorage，完成记录图片保存在 IndexedDB。
- App 能力：PWA、Android、iOS、离线缓存、Capacitor 同步、Android Debug APK。

## 开发

```bash
pnpm install
pnpm run dev
pnpm run build
```

## 同步到 App

```bash
pnpm run app:sync
```

## 生成 Android Debug APK

```bash
pnpm run build
pnpm exec cap sync android
cd android
./gradlew assembleDebug
```

生成文件：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## 数据提醒

所有数据默认只保存在当前设备。卸载 App、清除浏览器站点数据或清除应用数据可能导致记录丢失，请定期在“我的 → 数据管理”中导出 JSON 或完整 ZIP 备份。
