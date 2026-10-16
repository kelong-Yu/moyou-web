import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { RefObject } from "react";
import { Hand, ScanEye, VideoOff, X } from "lucide-react";
import MoyouLoading from "../../../components/MoyouLoading";
import type {
    GesturePagerStatus,
    SwipeDirection,
    SwipeEvent,
} from "../../../hooks/useHandWavePager";
import "./GesturePagerPanel.css";

export interface GesturePagerPanelProps {
    /** 摄像头取帧视频元素 ref（由 useHandWavePager 提供，面板内不可见但必须挂载） */
    videoRef: RefObject<HTMLVideoElement | null>;

    /** 当前状态 */
    status: GesturePagerStatus;

    /** 错误 / 权限拒绝提示文案 */
    errorMessage: string;

    /** 最近一次成功识别的挥腕（用于短暂反馈） */
    lastSwipe: SwipeEvent | null;

    /** 停止并关闭面板 */
    onStop: () => void;
}

/** 挥腕反馈停留时长（毫秒），到期后自动回到「正在识别」态 */
const FLASH_MS = 1100;

/** 忙态（请求权限 / 加载模型）提示文案 */
const BUSY_TEXT: Partial<Record<GesturePagerStatus, string>> = {
    idle: "正在准备手势识别……",
    "requesting-camera": "正在请求摄像头权限，请在浏览器弹窗中允许",
    "loading-model": "正在加载手势识别模型，请耐心等待",
};

/** 识别到某个方向后给出的操作提示（与翻页方向同一套语义） */
const SWIPE_TEXT: Record<SwipeDirection, string> = {
    down: "请向下挥动手腕",
    up: "请向上挥动手腕",
};

/**
 * 底部常驻操作提示
 *
 * 手形图标指向与挥动方向相反是刻意的：手指朝上代表「向下挥腕 = 下一页」，
 * 手指朝下代表「向上挥腕 = 上一页」，因此每条都补一句文字说明避免误解。
 */
const GESTURE_HINTS: {
    pointing: SwipeDirection;
    label: string;
    note: string;
}[] = [
    { pointing: "up", label: "下一页", note: "向下挥腕" },
    { pointing: "down", label: "上一页", note: "向上挥腕" },
];

/** 手形图标：手指朝上为原图，手指朝下用 180° 旋转 */
const HandGlyph = ({
    pointing,
    size = 20,
    className = "",
}: {
    pointing: SwipeDirection;
    size?: number;
    className?: string;
}) => (
    <Hand
        size={size}
        strokeWidth={1.8}
        className={pointing === "down" ? `${className} rotate-180` : className}
    />
);

/**
 * 手势翻页状态面板
 *
 * 悬浮于全屏大图查看器顶部居中，通过 Portal 挂载到 body 并置于查看器
 * （z-[9999]）之上。不展示摄像头画面（识别仍在后台取帧），
 * 关闭入口是右上角的 X 图标。
 *
 * 自上而下三段，左右两端对齐：
 * 1. 状态图标：忙态为水墨 Loading，识别中为扫描眼睛，命中手势时短暂换成手形；
 * 2. 提示文字 + 下划线；
 * 3. 常驻的两条操作提示（下一页 / 上一页）。
 */
const GesturePagerPanel = ({
    videoRef,
    status,
    errorMessage,
    lastSwipe,
    onStop,
}: GesturePagerPanelProps) => {
    /**
     * 反馈到期标记：只由定时器写入，效果体内不同步 setState。
     * 当前这次挥手还没被记为到期，就仍在反馈窗口内。
     */
    const [expiredSwipe, setExpiredSwipe] = useState<number | null>(null);

    useEffect(() => {
        if (!lastSwipe) return undefined;

        const timer = window.setTimeout(
            () => setExpiredSwipe(lastSwipe.at),
            FLASH_MS
        );

        return () => window.clearTimeout(timer);
    }, [lastSwipe]);

    const failed = status === "denied" || status === "error";

    const flashDirection: SwipeDirection | null =
        status === "running" && lastSwipe && expiredSwipe !== lastSwipe.at
            ? lastSwipe.direction
            : null;

    const tipText = failed
        ? errorMessage || "手势翻页启动失败"
        : flashDirection
          ? SWIPE_TEXT[flashDirection]
          : status === "running"
            ? "正在识别您的手势"
            : BUSY_TEXT[status] || BUSY_TEXT.idle!;

    return createPortal(
        <div className="fixed left-1/2 top-3 z-[10000] -translate-x-1/2 font-serif">
            <div className="gesture-panel relative w-[300px] rounded-xl border border-[#964328]/25 bg-[#FAF6ED]/95 px-5 pb-4 pt-3.5 shadow-lg">
                {/* 识别取帧用视频：不展示画面，但必须留在文档里供 MediaPipe 读帧 */}
                <video
                    ref={videoRef}
                    muted
                    playsInline
                    aria-hidden="true"
                    className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-0"
                />

                {/* 关闭（停止识别并释放摄像头） */}
                <button
                    type="button"
                    onClick={onStop}
                    aria-label="关闭手势翻页"
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-0 bg-transparent text-[#756B61] transition-colors hover:bg-[#964328]/10 hover:text-[#964328] cursor-pointer"
                >
                    <X size={15} strokeWidth={2.2} />
                </button>

                {/* 状态图标 */}
                <div className="flex h-16 items-center justify-center">
                    {failed ? (
                        <VideoOff
                            size={30}
                            strokeWidth={1.6}
                            className="text-[#964328]/70"
                        />
                    ) : flashDirection ? (
                        <HandGlyph
                            pointing={flashDirection}
                            size={30}
                            className="text-[#964328] gesture-pop"
                        />
                    ) : status === "running" ? (
                        <ScanEye
                            size={30}
                            strokeWidth={1.6}
                            className="gesture-scan text-[#964328]"
                        />
                    ) : (
                        <MoyouLoading
                            className="moyou-loading--compact"
                            tip=""
                        />
                    )}
                </div>

                {/* 提示文字 + 下划线 */}
                <p
                    className={`mt-1 text-center text-[13px] leading-5 ${
                        failed ? "text-[#964328]" : "text-[#3F332A]"
                    }`}
                >
                    {tipText}
                </p>
                <div className="gesture-rule mt-2 h-px w-full bg-[#964328]/25" />

                {/* 常驻操作提示：与上方文字左右两端对齐 */}
                <div className="mt-3 flex items-center justify-between">
                    {GESTURE_HINTS.map((hint) => (
                        <div
                            key={hint.label}
                            className="flex items-center gap-1.5 text-[#756B61]"
                        >
                            <HandGlyph pointing={hint.pointing} size={18} />
                            <span className="text-[12px] font-bold text-[#3F332A]">
                                {hint.label}
                            </span>
                            <span className="text-[11px]">{hint.note}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default GesturePagerPanel;
