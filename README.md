# 🥷 嘉豪值测试 · 测出你的本命嘉豪

> 你是哪种嘉豪？答题算出你的**豪意值**，抽出你的**本命嘉豪**——自在极意豪、上课全对豪、虚空打碟豪……
> 一个模仿 MBTI 的趣味人格测试，用最正经的"科学测试"外壳，包裹最沙雕的嘉豪梗。

🌐 **在线体验**：部署到 GitHub Pages 后填在这里 → `https://你的用户名.github.io/jiahao-test/`

---

## ✨ 功能

- 🧠 **四维混合测试**：选择题 + 程度滑块题，装 / 二 / 骚 / 觉 四个维度，算出 0–100 豪意值（精确到小数点后 3 位）
- 🎁 **开盲盒**：14 款本命嘉豪（12 常规 + 2 隐藏款），带稀有度发光
- 📊 **豪意值 + 四维雷达**：击败全国 X% 的嘉豪
- 📸 **一键分享卡**：canvas 生成可存图发朋友圈
- 🏆 **云排行榜**：Supabase 上云，断网自动 localStorage 兜底
- 📖 **豪型图鉴**：收集所有嘉豪，隐藏款永远问号保神秘
- 🥷 **吉祥物全程陪伴**：做题反应、开盒转圈、结果庆祝

---

## 🚀 本地预览

**方式一：一键启动（推荐）**

双击 `zeen-tools/一键启动前端.bat`，自动启动本地服务器并打开浏览器。

**方式二：命令行**

```bash
node local-preview-server.js
# 打开 http://localhost:8091
```

> ⚠️ 不要直接双击 `index.html` —— `fetch` 加载 JSON 在 `file://` 协议下会跨域失败，必须通过本地服务器访问。

**停止服务**：双击 `zeen-tools/一键关闭前端.bat`，或按 `Ctrl+C`。

---

## ☁️ 接入 Supabase 云排行榜（可选）

默认单机模式（localStorage），要启用云排行榜：

1. 去 [supabase.com](https://supabase.com) 新建一个项目
2. 在 SQL Editor 执行建表语句（见 `js/config/supabase.js` 注释）
3. 开启 RLS，添加匿名 insert/select 策略
4. 把项目的 **URL** 和 **publishable (anon) key** 填入 `js/config/supabase.js`

```js
const SUPABASE_URL = 'https://xxxx.supabase.co';  // 填这里
const SUPABASE_KEY = 'eyJhbGci...';                // publishable key，不是 service role！
```

> 🚨 绝不要把 service role key 放进前端代码。只用 publishable (anon) key + RLS。

---

## 📦 部署到 GitHub Pages

```bash
# 1. 新建仓库（不要用 username.github.io）
gh repo create jiahao-test --public --source=. --push

# 2. 推到 main 分支
git add . && git commit -m "嘉豪值测试" && git push

# 3. 仓库 Settings → Pages → Source: main 分支 / root
# 等几分钟，访问 https://你的用户名.github.io/jiahao-test/
```

---

## 🎨 素材

- **表情包**：`img/sticker/` 下 209 张周三涵系列表情（从 `E:\星星布丁\微信表情包` 复制，运行 `node scripts/copy-assets.js` 可重新复制）
- **嘉豪梗图**：当前用 emoji 占位（labels.json 的 `img: "emoji"`），后续可在网上找虚空打碟、全黑穿搭等经典嘉豪梗图替换

---

## 🧩 项目结构

```
嘉豪值测试/
├── index.html                  # SPA 入口
├── css/                        # 糖果风样式 + 童话装饰 + 开盒动画 + 响应式
├── js/
│   ├── app.js                  # 主程序：数据加载 + hash 路由
│   ├── config/supabase.js      # 云后端配置（可选）
│   ├── data/                   # 题库/豪型/分档 JSON + repository 数据层
│   ├── modules/                # 引擎/标签/骚话/吉祥物/分享卡
│   └── pages/                  # 首页/结果/排行榜/图鉴/关于
├── img/sticker/                # 嘉豪表情包
├── scripts/                    # 复制素材 + 单元测试 + 端到端测试
├── local-preview-server.js     # 本地预览服务
└── zeen-tools/                 # 一键启动/关闭 bat
```

## 🔬 测试

```bash
node scripts/test-engine.js     # 引擎逻辑单元测试（17项）
node scripts/test-e2e.js        # 端到端流程测试（需先启动预览服务器）
```

---

## 📖 关于"嘉豪"

**嘉豪**是 2024 年诞生的网络梗：一位穿黑衣黑帽黑口罩的中学生，在教室模仿 Alan Walker《The Spectre》"虚空打碟"，视频被误标"嘉豪"出圈。从此"嘉豪"=爱装×、爱表现、中二爆棚（尤其中学男生）的行为代名词。**豪意值**衡量一个人有多嘉豪。

参考：[百度百科"嘉豪"](https://baike.baidu.com/item/嘉豪/66804028)、[游民星空《全世界都成为了嘉豪》](https://www.gamersky.com/news/202605/2141521.shtml)

> 质疑嘉豪，理解嘉豪，成为嘉豪。
