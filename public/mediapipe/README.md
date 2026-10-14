# MediaPipe 手势识别本地静态资源

临帖页「手势翻页」优先从以下本地路径加载资源，
探测不到时会自动回退到官方 CDN（需联网）。

✅ 本目录的 WASM 与模型已于 2026-10-14 放置完毕
（WASM 复制自 @mediapipe/tasks-vision@1.1.0，
模型下载自 Google 官方 storage），正常情况下无需再做任何操作。
仅在升级依赖版本或文件丢失时，按下面步骤重新放置。

## 目录结构

```text
public/mediapipe/
├── wasm/                          # @mediapipe/tasks-vision 的 WASM 运行时
│   ├── vision_wasm_internal.js
│   ├── vision_wasm_internal.wasm
│   ├── vision_wasm_nosimd_internal.js    # 可选：不支持 SIMD 的浏览器回退
│   └── vision_wasm_nosimd_internal.wasm  # 可选
└── models/
    └── hand_landmarker.task       # 手部关键点模型（约 7.8 MB）
```

## 1. WASM：直接从 node_modules 复制

依赖 `@mediapipe/tasks-vision@1.1.0` 安装后，
在 `moyou-web` 目录执行（PowerShell）：

```powershell
New-Item -ItemType Directory -Force -Path .\public\mediapipe\wasm, .\public\mediapipe\models
Copy-Item .\node_modules\@mediapipe\tasks-vision\wasm\* .\public\mediapipe\wasm\
```

> 升级 `@mediapipe/tasks-vision` 版本后需重新复制一次。

## 2. 模型：npm 包里没有，需要手动下载一次

官方模型地址（Google 存储，约 7.8 MB）：

```text
https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
```

PowerShell 下载：

```powershell
Invoke-WebRequest `
  -Uri "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task" `
  -OutFile .\public\mediapipe\models\hand_landmarker.task
```

或直接用浏览器下载后改名为 `hand_landmarker.task` 放入 `models/` 目录。

## 3. 验证

放置完成后，临帖页开启「手势翻页」，
浏览器 DevTools Network 面板中应看到
`/mediapipe/wasm/vision_wasm_internal.wasm` 与
`/mediapipe/models/hand_landmarker.task` 两个本地请求（200），
而不是 jsdelivr / storage.googleapis.com 的 CDN 请求。
