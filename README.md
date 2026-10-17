# 天规 · Celestial Law

黑暗中式修仙与规则怪谈题材的动作肉鸽原型。守规求生，借规杀敌，炼规成仙。

## 当前 Demo · 美术版 0.2

- 六处短局与随机分岔：普通战、精英、商店、休整和事件。
- 18 项功法，三选一奖励；支持剑修、雷罚和纸人构筑。
- 钟律、灯律、界律同时约束敌我，可通过推击诱使妖物触犯天规。
- 双阶段首领、死亡重开、种子复现与本机保存的起始契约解锁。

本版本用于验证玩法；尚未实现随机房间地形、音效、自由改律、完整剧情或单局断点存档。难度与手感仍需真人试玩调整。

## 美术更新

旧祠堂石院与山门主视觉、六种原创角色形象、雾气与灯火、飞剑与天雷光效、符纸功法卡片。玩法与种子随机序列保持兼容。角色目前使用静态素材与程序呼吸/漂浮效果，尚无逐帧行走动画。

素材由 OpenAI 内置 imagegen 生成；参考链接和完整提示词见 [美术记录](assets/ART_DIRECTION.txt)。素材随仓库提供，运行时不请求外部图片服务。

## 本地运行

直接用桌面浏览器打开 `index.html`。无需安装依赖、构建步骤、账号或联网。

请保留完整仓库结构，包括 `art.js` 与 `assets/` 素材目录。也可以使用任意静态 HTTP 服务器运行仓库根目录。

| 操作 | 按键 |
| --- | --- |
| 移动 | WASD / 方向键 |
| 自动瞄准飞剑 | 持按 J / 鼠标左键 |
| 震步推敌 | Q |
| 纸人代罚 | E |
| 闪避 | 空格 |
| 暂停 | P / Esc |

钟响前停止移动，或用纸人代罚；钟响前把妖物推开，可让天雷替你杀敌。闪避不能免除天规惩罚。

## Cloudflare Pages 部署

连接此 GitHub 仓库，使用以下配置：

| 字段 | 值 |
| --- | --- |
| Project name | `celestial-law` |
| Production branch | `main` |
| Framework preset | `None` |
| Build command | `exit 0` |
| Build output directory | `.` |
| Root directory | 留空，使用仓库根目录 |
| Environment variables | 无需添加 |

点击 **Save and Deploy**。以 Cloudflare 返回的生产地址为准。配置 Git 集成后，生产分支的新提交可触发后续部署。

[Cloudflare 静态 HTML 部署文档](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)

## 文件说明

- `index.html`：游戏入口。
- `game.js`：游戏逻辑与 Canvas 绘制。
- `style.css`：界面样式。
- `art.js`：美术素材加载、角色与场景渲染；加载失败时回退原始图形。
- `assets/`：场景、角色图集、标题画与提示词记录。
- `plan.html`：游戏设计、内容范围、开发路线和验收计划。
- `verification.txt`：测试记录及验证限制。
- `DEPLOYMENT.txt`：部署配置速查。

局外解锁保存在浏览器 localStorage。清除站点数据会清除解锁；不同浏览器、不同域名及本地文件入口的存档不共享。
