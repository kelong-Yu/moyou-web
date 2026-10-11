import { useId } from "react";
import "./index.css";

export interface MoyouLoadingProps {
    /**
     * 加载提示文字
     *
     * 默认「正在加载……」
     */
    tip?: string;

    /**
     * 附加类名
     *
     * 用于父容器控制展示位置与尺寸，
     * 内置「moyou-loading--compact」紧凑变体可供选用。
     * 组件默认铺满父容器（width/height 100%）。
     */
    className?: string;
}

/**
 * 墨友统一 Loading 加载组件
 *
 * 水墨笔触动画：SVG 圆相笔画由墨黑渐入主题色 #964328，
 * 循环"起笔 — 行笔 — 收笔"，中心墨点同步呼吸；
 * 下方展示「墨友」品牌名与加载提示。
 *
 * - 纯 CSS 动画，无第三方动画依赖；
 * - 支持 prefers-reduced-motion（减少动态时静态展示）；
 * - 无障碍：role="status" + aria-live="polite"；
 * - 加载结束由调用方条件渲染移除，组件内部不管理定时器。
 */
const MoyouLoading = ({
    tip = "正在加载……",
    className = "",
}: MoyouLoadingProps) => {
    // 渐变 id 按实例隔离，避免同页多实例互相干扰
    const gradientId = useId();

    return (
        <div
            className={`moyou-loading ${className}`.trim()}
            role="status"
            aria-live="polite"
        >
            <svg
                className="moyou-loading__ink"
                viewBox="0 0 64 64"
                aria-hidden="true"
                focusable="false"
            >
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#1A1815" />
                        <stop offset="1" stopColor="#964328" />
                    </linearGradient>
                </defs>

                {/* 行笔弧线：墨黑 → 主题色 */}
                <circle
                    className="moyou-loading__arc"
                    cx="32"
                    cy="32"
                    r="24"
                    fill="none"
                    stroke={`url(#${gradientId})`}
                    strokeWidth="4.5"
                    strokeLinecap="round"
                />

                {/* 中心墨点 */}
                <circle
                    className="moyou-loading__dot"
                    cx="32"
                    cy="32"
                    r="3.5"
                    fill="#964328"
                />
            </svg>

            <p className="moyou-loading__tip">{tip}</p>
        </div>
    );
};

export default MoyouLoading;
