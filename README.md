# 星芽奇旅 · Kids Learning Games

一个面向 3-6 岁儿童的离线学习游戏项目。孩子可以在探索地图中完成数学、比较和拼音挑战，也可以进入学习馆认识汉字、英语和古诗，或在放松站玩轻量小游戏。

**项目类型：** React + TypeScript + Phaser + Electron

## 游戏截图

### 探索地图

<p align="center">
	<img src="docs/screenshots/explore-map.png" alt="星芽奇旅探索地图，包含数字花园、大小森林和声音云港" width="100%" />
</p>

### 探索学习世界

<p align="center">
	<img src="docs/screenshots/math-garden.png" alt="数字花园数数挑战" width="32%" />
	<img src="docs/screenshots/comparison-forest.png" alt="大小森林比较挑战" width="32%" />
	<img src="docs/screenshots/pinyin-harbor.png" alt="声音云港拼音挑战" width="32%" />
</p>

| 数字花园 | 大小森林 | 声音云港 |
| --- | --- | --- |
| 数数、加法、减法和混合算术 | 更多、更少和三步排序 | 图片线索与拼音辨认 |

### 学习馆

<p align="center">
	<img src="docs/screenshots/learning-pinyin.png" alt="拼音小耳朵学习卡" width="32%" />
	<img src="docs/screenshots/learning-hanzi.png" alt="汉字小屋学习卡" width="32%" />
	<img src="docs/screenshots/learning-english-words.png" alt="英语单词岛学习卡" width="32%" />
</p>
<p align="center">
	<img src="docs/screenshots/learning-english-phrases.png" alt="英语短句站学习卡" width="32%" />
	<img src="docs/screenshots/learning-poetry.png" alt="古诗小灯学习卡" width="32%" />
</p>

| 拼音 | 汉字 | 英语单词 | 英语短句 | 古诗 |
| --- | --- | --- | --- | --- |
| 图片与拼音匹配 | 人物、食物、交通、动物和水果等常用字 | 身边物品和动物词汇 | 问候、上学和外出等常用表达 | 名篇名句填空 |

### 放松站

<p align="center">
	<img src="docs/screenshots/game-thunder-flight.png" alt="雷光飞行小游戏" width="32%" />
	<img src="docs/screenshots/game-rainbow-blocks.png" alt="彩虹方块小游戏" width="32%" />
	<img src="docs/screenshots/game-tiny-race.png" alt="小小赛车小游戏" width="32%" />
</p>

| 雷光飞行 | 彩虹方块 | 小小赛车 |
| --- | --- | --- |
| 躲避云团、收集星芽 | 移动、旋转和消除彩色方块 | 换车道、避障和收集星芽 |

## 功能

- 探索地图：三个学习世界各有 5 个节点，每个节点包含 6-10 道挑战。
- 成长反馈：首次完成节点可获得星芽与伙伴碎片；每个世界收集 4 枚碎片可解锁一位伙伴。
- 学习馆：每类练习都有本地图片、三选一题卡、一次温和提示与可选系统朗读。
- 放松站：三种 1-3 分钟的轻量小游戏，支持儿童触控、键盘和手柄操作。

## 隐私与声音

- 无账号、无广告、无社交、无排行榜和无个人信息收集。
- 所有学习进度只保存在当前设备的浏览器本地存储中。
- 游戏默认静音；只有玩家主动打开声音后，学习卡和提示才会使用系统语音朗读。

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
- `docs/screenshots/`：README 中使用的真实游戏截图。
- `electron/`：桌面主进程和预加载脚本。
- `scripts/`：素材下载与自动化内容/UI 验证。

## 发布前说明

“星芽奇旅”是当前产品品牌名。正式上架前仍应完成应用商店、域名和商标近似检索。桌面应用标识 `com.kids.learn-game` 暂未变更，以避免已有安装用户的升级路径中断。
