import { createPortal } from "react-dom";
import type { RefObject } from "react";
import {
    ArrowLeftOutlined,
    ArrowRightOutlined,
    VideoCameraOutlined,
} from "@ant-design/icons";
import MoyouLoading from "../../../components/MoyouLoading";
import type {
    GesturePagerStatus,
    SwipeEvent,
} from "../../../hooks/useHandWavePager";
import "./GesturePagerPanel.css";

export interface GesturePagerPanelProps {
    /** 摄像头预览视频元素 ref（由 useHandWavePager 提供） */
    videoRef: RefObject<HTMLVideoElement | null>;

    /** 当前状态 */
    status: GesturePagerStatus;

    /** 错误 / 权限拒绝提示文案 */
    errorMessage: string;

    /** 最近一次成功识别的挥手（用于短暂反馈） */
    lastSwipe: SwipeEvent | null;

    /** 停止并关闭面板 */
    onStop: () => void;
}

/** 状态点对应颜色 */
const STATUS_DOT: Record<GesturePagerStatus, string> = {
    idle: "bg-[#B8AFA4]",
    "requesting-camera": "bg-amber-500",
    "loading-model": "bg-amber-500",
    running: "bg-green-600",
    denied: "bg-[#964328]",
    error: "bg-[#964328]",
};

/** 状态短文案 */
const STATUS_TEXT: Record<GesturePagerStatus, string> = {
    idle: "准备中……",
    "requesting-camera": "正在请求摄像头权限……",
    "loading-model": "正在加载手势识别模型……",
    running: "识别中 · 向左挥 = 下一张 · 向右挥 = 上一张",
    denied: "摄像头权限被拒绝",
    error: "手势翻页启动失败",
};

/**
 * 手势翻页状态面板
 *
 * 悬浮于全屏大图查看器顶部居中（横条状，不遮挡中央图片 / 卡片），
 * 通过 Portal 挂载到 body 并置于查看器（z-[9999]）之上：
 *
 * - 小尺寸镜像摄像头预览，方便用户对照自己的手部动作；
 * - 展示开启中 / 识别中 / 权限被拒 / 模型加载失败等状态；
 * - 识别成功时在预览框内闪现"下一张 / 上一张"反馈
 *   （CSS 动画自动淡出，以挥手时间戳为 key 重挂载重播）；
 * - 提供明确的"停止"按钮。
 */
const GesturePagerPanel = ({
    videoRef,
    status,
    errorMessage,
    lastSwipe,
    onStop,
}: GesturePagerPanelProps) => {
    const busy =
        status === "requesting-camera" || status === "loading-model";

    const failed = status === "denied" || status === "error";

    return createPortal(
        <div className="fixed left-1/2 top-3 z-[10000] -translate-x-1/2 font-serif">
            <div className="flex items-center gap-3 rounded-xl border border-[#964328]/25 bg-[#FAF6ED]/95 shadow-lg pl-3 pr-2.5 py-2">
                {/* 镜像摄像头预览（小尺寸） */}
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md bg-[#1A1815]">
                    <video
                        ref={videoRef}
                        muted
                        playsInline
                        className={`h-full w-full object-cover ${
                            status === "running" ? "" : "opacity-0"
                        }`}
                        style={{ transform: "scaleX(-1)" }}
                    />

                    {/* 开启中 / 加载模型：MoyouLoading 紧凑变体 */}
                    {busy && (
                        <div className="absolute inset-0">
                            <MoyouLoading
                                className="moyou-loading--compact"
                                tip=""
                            />
                        </div>
                    )}

                    {/* 失败状态：图标占位 */}
                    {failed && (
                        <div className="absolute inset-0 flex items-center justify-center text-amber-100/60 text-lg">
                            <VideoCameraOutlined />
                        </div>
                    )}

                    {/* 挥手成功反馈：以时间戳为 key 重挂载，CSS 动画自动淡出 */}
                    {lastSwipe && status === "running" && (
                        <span
                            key={lastSwipe.at}
                            className="gesture-swipe-flash absolute inset-0 flex items-center justify-center gap-0.5 bg-[#1A1815]/65 text-amber-100 text-[11px]"
                        >
                            {lastSwipe.direction === "left" ? (
                                <>
                                    下一张 <ArrowRightOutlined />
                                </>
                            ) : (
                                <>
                                    <ArrowLeftOutlined /> 上一张
                                </>
                            )}
                        </span>
                    )}
                </div>

                {/* 标题 + 状态文案 */}
                <div className="min-w-0 max-w-72">
                    <div className="flex items-center gap-1.5">
                        <VideoCameraOutlined className="text-[#964328] text-xs" />
                        <span className="text-[13px] font-bold text-[#3F332A]">
                            手势翻页
                        </span>
                        <span
                            className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`}
                        />
                    </div>
                    <p
                        className={`mt-0.5 text-[11px] leading-4 ${
                            failed ? "text-[#964328]" : "text-[#756B61]"
                        }`}
                    >
                        {failed && errorMessage
                            ? errorMessage
                            : STATUS_TEXT[status]}
                    </p>
                </div>

                {/* 停止 / 关闭按钮 */}
                <button
                    type="button"
                    onClick={onStop}
                    className={`shrink-0 rounded-full border-0 px-3 py-1 text-xs cursor-pointer transition-colors ${
                        failed
                            ? "bg-[#F5EBDD] text-[#3F332A] hover:bg-[#EADFC8]"
                            : "bg-[#964328] text-[#FFF8ED] hover:bg-[#7e3720]"
                    }`}
                >
                    {failed ? "关闭" : "停止"}
                </button>
            </div>
        </div>,
        document.body
    );
};

export default GesturePagerPanel;
