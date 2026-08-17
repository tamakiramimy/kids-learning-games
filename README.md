# 星芽奇旅

面向 3-6 岁儿童的离线探索学习游戏。孩子在地图中完成短时挑战、收集星芽和伙伴碎片，并在学习与放松之间自由切换。

## 功能

### 探索学习

- 数字花园：数数、加法、减法和混合算术。
- 大小森林：更多、更少和从小到大的三步排序。
- 声音云港：图片线索与拼音辨认。
- 每个节点有 6-10 题；首次完成可解锁下一站、获得星芽和伙伴碎片。
- 伙伴册：每个世界收集 4 枚碎片可解锁一位探索伙伴。

### 学习馆

每类练习包含图片、三选一题卡、一次温和提示和可选朗读：

- 拼音小耳朵
- 汉字小屋：人物、食物、交通工具、动物和水果等常用字
- 英语单词岛
- 英语短句站：问候、上学和外出等日常表达
- 古诗小灯：《春晓》《静夜思》《咏鹅》《悯农》《登鹳雀楼》等名篇名句

### 放松站

- 雷光飞行：躲避云团、收集星芽。
- 彩虹方块：移动、旋转和消除彩色方块。
- 小小赛车：换车道、避障和收集星芽。

## 隐私与声音

- 无账号、无广告、无社交、无排行榜和无个人信息收集。
- 所有学习进度仅保存在当前设备的浏览器本地存储中。
- 游戏默认静音。只有玩家主动打开声音后，学习卡和提示才会使用系统语音朗读。

## 快速开始

要求：Node.js 22 或更高版本、npm。

```bash
npm install
npm run dev
```

默认开发地址为 `http://localhost:3000`。

## 质量检查

```bash
npm run lint
npm run build
npm run test:learning
npm run test:generators
```

- `npm run build`：TypeScript 检查和 Vite 生产构建。
- `npm run test:learning`：学习内容、答案选项和本地图片资源完整性检查。
- `npm run test:generators`：随机题目边界检查。
- `npm run dev:electron`：启动 Electron 桌面开发模式。
- `npm run build:electron`：构建 macOS 与 Windows 桌面包。

## 操作

- 鼠标或触摸：点击世界、学习卡、放松游戏和答案。
- 键盘：方向键移动焦点，Enter 确认，Esc 返回，数字键 `1` 至 `4` 选择答案。
- 手柄：方向键选择，A 确认，B 返回；X 打开放松站，Y 打开学习馆，R1 打开伙伴册。

## 素材与第三方声明

学习图片使用 OpenMoji 本地 SVG 素材。执行以下命令可重新下载项目使用的图片：

```bash
npm run assets:learning
```

完整素材归属、许可证与第三方依赖声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 和 [public/assets/openmoji/ATTRIBUTION.md](public/assets/openmoji/ATTRIBUTION.md)。

## 项目结构

- `src/config/`：世界、学习内容和 Phaser 配置。
- `src/scenes/`：探索、学习、伙伴、奖励和放松游戏场景。
- `src/store/`：本地进度、星芽、伙伴碎片和音频状态。
- `public/assets/openmoji/`：本地学习图片和许可说明。
- `electron/`：桌面主进程和预加载脚本。
- `scripts/`：素材下载与自动化内容/UI 验证。

## 发布前说明

“星芽奇旅”是当前项目名称。正式上架前仍应完成应用商店、域名和商标近似检索。桌面应用标识 `com.kids.learn-game` 暂未变更，以避免已有安装用户的升级路径中断。
