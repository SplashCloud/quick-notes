# 快捷便利贴

随时随地用快捷键打开一个 Markdown 便利贴，记录一切。

## 功能

- `Cmd + Shift + N` 新建便利贴窗口
- 便利贴窗口支持 Markdown 文本输入、颜色切换、置顶和拖拽移动
- 主界面用日历展示每天的便利贴数量和字数
- 数据持久化到 Electron 的 `userData/notes.json`

## 运行

```bash
npm install
npm run dev
```

如果 Electron 下载超时，可以使用镜像：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install
```

## 构建

```bash
npm run build
npm run package
```

这个应用面向 macOS 设计，打包配置默认生成 macOS 应用目录。

## 发布给普通用户下载

推荐发布形态是直接分发 `.dmg`，用户下载后拖进 Applications 即可使用。`.zip` 通常用于自动更新或备用下载。

### 1. 准备 Apple 开发者身份

直接在 Mac App Store 外分发时，需要：

- Apple Developer Program 账号
- `Developer ID Application` 证书，安装在打包机器的 Keychain 中
- App Store Connect API Key，用于公证

没有签名和公证的包也能生成，但普通用户打开时会被 macOS Gatekeeper 明显拦截，不适合正式发布。

### 2. 修改 GitHub Release 配置

在 `package.json` 里把这段改成你的仓库：

```json
"publish": [
  {
    "provider": "github",
    "owner": "YOUR_GITHUB_USER_OR_ORG",
    "repo": "quick-sticky-notes"
  }
]
```

### 3. 在 macOS 机器上设置环境变量

```bash
export APPLE_API_KEY=/absolute/path/AuthKey_XXXXXXXXXX.p8
export APPLE_API_KEY_ID=XXXXXXXXXX
export APPLE_API_ISSUER=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
export GH_TOKEN=github_pat_or_token
```

`GH_TOKEN` 需要有创建 release 和上传 artifact 的权限。

### 4. 生成安装包

```bash
npm run dist:mac
```

产物会在 `dist/` 目录里，重点是：

- `快捷便利贴-0.1.0-arm64.dmg`
- `快捷便利贴-0.1.0-arm64.zip`

### 5. 发布到 GitHub Release

先更新 `package.json` 的 `version`，例如 `0.1.1`，然后运行：

```bash
npm run dist:mac:publish
```

发布后用户只需要进入 GitHub Release 页面下载 `.dmg`，不需要源代码、不需要 npm、不需要构建。
