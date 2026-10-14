import { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

/**
 * 手势翻页状态机
 *
 * idle             未开启
 * requesting-camera 正在请求 / 等待摄像头权限
 * loading-model    权限已通过，正在加载 MediaPipe 模型与 WASM
 * running          识别中
 * denied           摄像头权限被用户（或浏览器策略）拒绝
 * error            摄像头不可用 / 被占用 / 模型加载失败等
 */
export type GesturePagerStatus =
    | "idle"
    | "requesting-camera"
    | "loading-model"
    | "running"
    | "denied"
    | "error";

/** 挥手方向（以用户镜像画面中的视觉方向为准） */
export type SwipeDirection = "left" | "right";

/** 一次成功触发的手势记录 */
export interface SwipeEvent {
    direction: SwipeDirection;
    /** performance.now() 时间戳，供 UI 做短暂高亮 */
    at: number;
}

export interface UseHandWavePagerOptions {
    /** 用户向左挥动（镜像视觉方向）：语义由调用方绑定（当前为下一张） */
    onSwipeLeft: () => void;
    /** 用户向右挥动（镜像视觉方向）：语义由调用方绑定（当前为上一张） */
    onSwipeRight: () => void;
}

// ==================================================
// 可调调试参数（初始值，按真实测试再调整）
// ==================================================

/** 识别节流间隔（毫秒），约每秒 14 次，避免逐帧识别拖慢页面 */
const DETECT_INTERVAL_MS = 70;

/** 水平位移阈值：占画面宽度比例（18%） */
const WAVE_DISPLACEMENT_RATIO = 0.18;

/**
 * 手势时间窗口（毫秒）
 *
 * 只统计窗口内的手腕轨迹，挥动须在窗口期内完成
 * （建议区间 300 ~ 800，取中值 600）。
 * 窗口同时天然限制了"缓慢平移"被误判为挥手。
 */
const WAVE_WINDOW_MS = 600;

/** 两次翻页之间的冷却时间（毫秒），防抖 + 防重复触发 */
const SWIPE_COOLDOWN_MS = 900;

/** 等待摄像头出画面的超时（毫秒） */
const VIDEO_READY_TIMEOUT_MS = 5000;

// ==================================================
// MediaPipe 资源路径
//
// 优先本地静态资源（public/mediapipe/，放置方法见
// public/mediapipe/README.md），探测不到时自动回退 CDN，
// 保证未放置本地文件时功能依然可用（需要网络）。
// ==================================================

/** 本地 WASM 目录（对应 public/mediapipe/wasm/） */
const LOCAL_WASM_BASE = "/mediapipe/wasm";

/** 本地模型文件（对应 public/mediapipe/models/hand_landmarker.task） */
const LOCAL_MODEL_URL = "/mediapipe/models/hand_landmarker.task";

/** CDN WASM 目录，版本号需与 package.json 中 @mediapipe/tasks-vision 一致 */
const CDN_WASM_BASE =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm";

/** CDN 官方模型地址 */
const CDN_MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

/** HEAD 探测资源是否存在（本地 public 未放置文件时 Vite 返回 404） */
async function probeUrl(url: string): Promise<boolean> {
    try {
        const res = await fetch(url, { method: "HEAD" });
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * HandLandmarker 模块级单例
 *
 * 开启 / 停止多次切换时复用实例，避免重复下载模型；
 * 页面组件卸载时通过 disposeLandmarker() 释放。
 */
let landmarkerPromise: Promise<HandLandmarker> | null = null;

async function createLandmarkerOnce(): Promise<HandLandmarker> {
    if (!landmarkerPromise) {
        landmarkerPromise = (async () => {
            const wasmBase = (await probeUrl(`${LOCAL_WASM_BASE}/vision_wasm_internal.wasm`))
                ? LOCAL_WASM_BASE
                : CDN_WASM_BASE;

            const modelUrl = (await probeUrl(LOCAL_MODEL_URL))
                ? LOCAL_MODEL_URL
                : CDN_MODEL_URL;

            const vision = await FilesetResolver.forVisionTasks(wasmBase);

            return HandLandmarker.createFromOptions(vision, {
                baseOptions: { modelAssetPath: modelUrl },
                // 视频流模式，默认检测一只手即可
                runningMode: "VIDEO",
                numHands: 1,
            });
        })();

        // 初始化失败时清除缓存，允许下次开启重试
        landmarkerPromise.catch(() => {
            landmarkerPromise = null;
        });
    }

    return landmarkerPromise;
}

/** 释放 MediaPipe 实例（临帖页卸载时调用） */
export function disposeHandLandmarker() {
    landmarkerPromise?.then((instance) => instance.close()).catch(() => {});
    landmarkerPromise = null;
}

/** 手腕关键点索引（MediaPipe Hand Landmarks 0 号点） */
const WRIST_LANDMARK_INDEX = 0;

interface TrailPoint {
    /** 镜像修正后的水平坐标（0 ~ 1） */
    x: number;
    /** performance.now() 时间戳 */
    t: number;
}

/**
 * 手部左右挥手翻页 Hook
 *
 * 基于 @mediapipe/tasks-vision 的 HandLandmarker（VIDEO 模式）：
 *
 * 1. getUserMedia 打开前置摄像头；
 * 2. requestAnimationFrame 循环 + 节流（约 14 次/秒）做手部检测；
 * 3. 取手腕水平坐标（镜像修正后）在 600ms 滑动窗口内的
 *    最大单向左位移，超过画面宽度 18% 判定为一次挥手：
 *    向左挥 → onSwipeLeft（下一张），向右挥 → onSwipeRight（上一张）；
 * 4. 触发后立即清空轨迹并进入 900ms 冷却，
 *    手停留、抖动、噪声、连续检测同一动作都不会重复翻页；
 *    检测不到手时重置轨迹；
 * 5. stop() / 组件卸载时：取消 rAF、关闭 MediaStream、
 *    清空 video 元素，绝不残留摄像头占用。
 *
 * 调用方需渲染 <video ref={videoRef} muted playsInline />，
 * 并在调用 start() 前保证该元素已挂载。
 */
export function useHandWavePager(options: UseHandWavePagerOptions) {
    /** 供调用方挂到预览 <video> 上 */
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const [status, setStatus] = useState<GesturePagerStatus>("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const [lastSwipe, setLastSwipe] = useState<SwipeEvent | null>(null);

    // 每次渲染后同步最新回调，识别循环内始终调用最新的翻页处理函数
    // （在 effect 中更新，避免渲染期间写 ref）
    const callbacksRef = useRef(options);
    useEffect(() => {
        callbacksRef.current = options;
    });

    const streamRef = useRef<MediaStream | null>(null);
    const landmarkerRef = useRef<HandLandmarker | null>(null);
    const rafRef = useRef<number | null>(null);
    const runningRef = useRef(false);
    const lastDetectAtRef = useRef(0);
    const lastSwipeAtRef = useRef(0);
    /** 手腕轨迹滑动窗口 */
    const trailRef = useRef<TrailPoint[]>([]);

    /** 停止识别并释放摄像头（幂等，可重复调用） */
    function stop() {
        runningRef.current = false;

        if (rafRef.current != null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        const video = videoRef.current;
        if (video) {
            video.srcObject = null;
        }

        trailRef.current = [];
        setStatus("idle");
    }

    /**
     * 识别循环：rAF 驱动 + 时间节流。
     *
     * 时间戳直接使用 requestAnimationFrame 回调入参，
     * 避免在 Hook 闭包内调用 performance.now()。
     * 函数声明提升允许自身递归调度，且跨渲染闭包安全。
     */
    function detectLoop(now: number) {
        if (!runningRef.current) return;

        rafRef.current = requestAnimationFrame(detectLoop);

        const video = videoRef.current;
        const landmarker = landmarkerRef.current;
        if (!video || !landmarker || video.readyState < 2) return;

        if (now - lastDetectAtRef.current < DETECT_INTERVAL_MS) return;
        lastDetectAtRef.current = now;

        let result;
        try {
            result = landmarker.detectForVideo(video, now);
        } catch {
            // 单帧识别异常（如画面尺寸突变）跳过即可
            return;
        }

        const hand = result?.landmarks?.[0];

        // 检测不到手：重置轨迹，避免旧轨迹参与下一次判定
        if (!hand || !hand[WRIST_LANDMARK_INDEX]) {
            trailRef.current = [];
            return;
        }

        // 镜像修正：预览画面做了水平镜像，用户感知的水平坐标 = 1 - 原始 x。
        // 这样"用户向自己左侧挥"在镜像画面中就是向左移动，方向与页面行为一致。
        const mirroredX = 1 - hand[WRIST_LANDMARK_INDEX].x;

        const trail = trailRef.current;
        trail.push({ x: mirroredX, t: now });

        // 滑动窗口裁剪：只保留窗口期内的轨迹
        while (trail.length > 0 && now - trail[0].t > WAVE_WINDOW_MS) {
            trail.shift();
        }

        if (trail.length < 2) return;

        // 统计窗口内"先高后低的左向最大位移"与"先低后高的右向最大位移"
        let runMax = -Infinity;
        let runMin = Infinity;
        let leftDrop = 0;
        let rightRise = 0;

        for (const point of trail) {
            runMax = Math.max(runMax, point.x);
            runMin = Math.min(runMin, point.x);
            leftDrop = Math.max(leftDrop, runMax - point.x);
            rightRise = Math.max(rightRise, point.x - runMin);
        }

        const displacement = Math.max(leftDrop, rightRise);

        // 位移不足阈值：手停留 / 轻微抖动 / 检测噪声都不会触发
        if (displacement < WAVE_DISPLACEMENT_RATIO) return;

        // 冷却期内忽略，保证一次挥手最多触发一次翻页
        if (now - lastSwipeAtRef.current < SWIPE_COOLDOWN_MS) return;

        lastSwipeAtRef.current = now;
        // 触发后立刻清空轨迹，同一动作的后续帧不会二次计数
        trailRef.current = [];

        const direction: SwipeDirection =
            leftDrop >= rightRise ? "left" : "right";

        setLastSwipe({ direction, at: now });

        if (direction === "left") {
            callbacksRef.current.onSwipeLeft();
        } else {
            callbacksRef.current.onSwipeRight();
        }
    }

    /** 开启手势翻页（申请权限 → 打开摄像头 → 加载模型 → 进入识别循环） */
    async function start() {
        // 已在运行则忽略重复开启，避免重复初始化
        if (runningRef.current) return;

        setErrorMessage("");
        setStatus("requesting-camera");

        // ---------- 1. 摄像头 ----------
        let stream: MediaStream;

        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new DOMException("unsupported", "NotFoundError");
            }

            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 320 },
                    height: { ideal: 240 },
                    facingMode: "user",
                },
                audio: false,
            });
        } catch (error) {
            const name =
                error instanceof DOMException || error instanceof Error
                    ? error.name
                    : "";

            if (name === "NotAllowedError" || name === "SecurityError") {
                setStatus("denied");
                setErrorMessage(
                    "摄像头权限被拒绝。请在浏览器地址栏的权限设置中允许使用摄像头后重试，临帖页其他功能不受影响。"
                );
            } else if (name === "NotFoundError" || name === "OverconstrainedError") {
                setStatus("error");
                setErrorMessage("未检测到可用摄像头，请连接摄像头后重试。");
            } else if (name === "NotReadableError") {
                setStatus("error");
                setErrorMessage(
                    "摄像头被其他应用占用或暂时无法读取，请关闭占用程序后重试。"
                );
            } else {
                setStatus("error");
                setErrorMessage("摄像头开启失败，请稍后重试。");
            }
            return;
        }

        streamRef.current = stream;

        // 等待预览 <video> 挂载：
        // 面板由开关状态条件渲染，可能略晚于 start() 的调用时机
        let video = videoRef.current;
        for (let attempt = 0; !video && attempt < 40; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            video = videoRef.current;
        }

        if (!video) {
            stop();
            setStatus("error");
            setErrorMessage("摄像头预览组件尚未就绪，请重试。");
            return;
        }

        video.srcObject = stream;

        // ---------- 2. 等待画面就绪 ----------
        try {
            await video.play();

            if (video.readyState < 2) {
                await new Promise<void>((resolve, reject) => {
                    const timer = window.setTimeout(() => {
                        reject(new Error("video-ready-timeout"));
                    }, VIDEO_READY_TIMEOUT_MS);

                    video.addEventListener(
                        "loadedmetadata",
                        () => {
                            window.clearTimeout(timer);
                            resolve();
                        },
                        { once: true }
                    );
                });
            }
        } catch {
            stop();
            setStatus("error");
            setErrorMessage("摄像头预览启动失败，请重试。");
            return;
        }

        // ---------- 3. MediaPipe 模型 ----------
        setStatus("loading-model");

        try {
            landmarkerRef.current = await createLandmarkerOnce();
        } catch {
            stop();
            setStatus("error");
            setErrorMessage(
                "手势识别模型加载失败，请检查网络；或将模型放置到 public/mediapipe/（见该目录 README）后重试。"
            );
            return;
        }

        // 模型加载期间用户可能已点停止
        if (!streamRef.current) return;

        // ---------- 4. 进入识别循环 ----------
        runningRef.current = true;
        lastDetectAtRef.current = 0;
        lastSwipeAtRef.current = 0;
        trailRef.current = [];
        setStatus("running");
        rafRef.current = requestAnimationFrame(detectLoop);
    }

    // 组件卸载：停止一切并释放 MediaPipe 单例（离开临帖页时摄像头必关）
    useEffect(() => {
        return () => {
            runningRef.current = false;

            if (rafRef.current != null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }

            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }

            disposeHandLandmarker();
        };
    }, []);

    return {
        videoRef,
        status,
        errorMessage,
        lastSwipe,
        start,
        stop,
    };
}
