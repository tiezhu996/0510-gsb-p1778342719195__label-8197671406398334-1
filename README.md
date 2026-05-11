# 直播工资记账工具

一个简洁高效的直播工资记账工具，专为中控人员设计，用于管理主播工作时间和自动计算工资。

## ✨ 特性

- 📊 **智能分时计费**：自动识别早晚高峰时段（6-8点、22-24点 50元/小时，其他时段 40元/小时）
- 💾 **数据持久化**：使用 Supabase 云数据库，随时随地访问
- 📱 **响应式设计**：完美支持手机、平板、电脑多端访问
- 📈 **实时统计**：自动汇总今日/本周/本月收入数据
- 🎨 **现代 UI**：渐变背景、流畅动画、优雅交互

## 🛠 技术栈

- **Frontend**: HTML5 + CSS3 + JavaScript (原生)
- **UI Framework**: TailwindCSS (CDN)
- **Database**: Supabase (PostgreSQL)
- **Deployment**: 静态 HTML（可部署到 Netlify、Vercel、GitHub Pages）

## 🚀 快速开始

### 1. 配置 Supabase

请先阅读 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) 完成以下步骤：
1. 创建 Supabase 项目
2. 执行 SQL 脚本创建数据表（或直接运行根目录下的 `schema.sql`）
3. 获取 Project URL 和 anon key

### 2. 本地运行

直接在本地打开 `index.html` 即可使用！

测试配置： 
Supabase URL: https://dyrucsribyhoxnhdrvll.supabase.co

Supabase Anon Key:sb_publishable_3izat2xoJjdFj8PiPqTKWQ_z3xa1VfD


或者使用本地服务器（推荐）：

```bash
# 使用 Python
python3 -m http.server 8000

# 或使用 Node.js
npx serve

# 或使用 PHP
php -S localhost:8000
```

然后访问 `http://localhost:8000`

### 3. 配置应用

1. 点击页面上的 "⚙️ Supabase 配置"
2. 填入你的 Supabase URL 和 anon key
3. 点击 "保存配置"

配置信息会自动保存在浏览器本地存储中，无需每次重新输入。

## 📖 使用说明

### 添加工作记录

1. 选择开始时间和结束时间
2. 可选填写备注信息
3. 点击"添加记录"
4. 系统自动计算工资并保存

### 工资计算规则

- **早班** (6:00-8:00): 50元/小时
- **常规** (8:00-22:00): 40元/小时  
- **晚班** (22:00-24:00): 50元/小时

跨时段的工作时间会自动分段计算，确保计费准确。

### 查看统计

页面顶部会实时显示：
- 今日总收入
- 本周总收入
- 本月总收入

### 管理记录

- 所有记录按时间倒序显示
- 点击"删除"按钮可删除不需要的记录

## 🌐 部署到 Netlify

### 方法一：拖拽部署

1. 访问 [https://app.netlify.com/drop](https://app.netlify.com/drop)
2. 将 `index.html` 文件拖入上传区域
3. 等待部署完成，获得公网访问地址

### 方法二：GitHub 部署

1. 将项目推送到 GitHub 仓库
2. 登录 Netlify，点击 "New site from Git"
3. 选择你的仓库
4. 无需配置构建命令，直接点击 "Deploy"

部署完成后，即可通过 Netlify 提供的 URL 在任何设备上访问！

## 📱 移动端使用

在手机浏览器中访问部署后的 URL，可以：
- 添加到主屏幕，像 App 一样使用
- 随时随地记录工作时间
- 查看实时统计数据

## 🔐 安全说明

当前配置允许任何知道链接的人访问数据。如需增强安全性：

1. 在 Supabase 启用 Email 认证
2. 修改 RLS 策略，限制访问权限
3. 为应用添加登录功能

对于公司内部使用，当前配置已足够安全。

## 📄 许可证

MIT License

## 🙋 支持

如有问题，请查看 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) 配置指南。