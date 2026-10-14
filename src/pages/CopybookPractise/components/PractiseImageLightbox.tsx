import {
    useEffect,
    useRef,
    useState,
    type MouseEvent as ReactMouseEvent,
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
    AimOutlined,
    CloseOutlined,
    FullscreenExitOutlined,
    FullscreenOutlined,
    LeftOutlined,
    RightOutlined,
    ZoomInOutlined,
    ZoomOutOutlined,
} from "@ant-design/icons";
import MoyouLoading from "../../../components/MoyouLoading";

/** 缩放范围 */
const MIN_SCALE = 0.2;
const MAX_SCALE = 8;

const clampScale = (value: number) =>
    Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

export interface PractiseLightboxProps {
    /** 总张数（当前查看序列的长度） */
    total: number;

    /** 当前序号（从 0 开始） */
    index: number;

    /** 上一张 / 下一张切换回调 */
    onIndexChange: (index: number) => void;

    /** 关闭查看器 */
    onClose: () => void;

    /** 顶部左侧标题（如碑帖名称） */
    heading?: ReactNode;

    /** 顶部次级标签（如"第 3 页 · 3/12"） */
    label?: ReactNode;

    /** 当前内容加载中（如高清大图请求中），显示加载动画 */
    loading?: boolean;

    /** 当前内容加载失败提示，传入后隐藏内容 */
    error?: string | null;

    /** 当前序号对应的内容（大图 <img> 或单字卡片），随缩放一起放大缩小 */
    children: ReactNode;
}

/**
 * 临帖页全屏大图查看器
 *
 * 在当前页面内以全屏覆盖层形式打开，
 * 不新开浏览器窗口、不做路由跳转：
 *
 * - 暗沉背景（近黑色半透明）；
 * - 滚轮 / 底部按钮 / 键盘 +/- 缩放，双击快速放大还原；
 * - 按住拖拽平移，0 或点击百分比复位；
 * - 左右箭头按钮与 ← / → 键查看上一张、下一张；
 * - Esc 或右上角按钮关闭，打开期间锁定页面滚动；
 * - 切换序号时自动重置缩放与平移；
 * - 沉浸式模式（点击空白区域 / 底部工具条全屏图标切换）：
 *   隐藏顶部标题栏、底部缩放工具条与左右切换按钮，
 *   沉浸时只展示图片或卡片本身；
 *   再次点击空白、点全屏图标（恢复后可见）或按 Esc 恢复界面，
 *   Esc 在界面可见时才关闭查看器。
 *
 * 内容整体（图片或单字卡片）由 children 提供，
 * 缩放变换作用于整个内容容器，卡片同样跟随放大缩小。
 */
const PractiseImageLightbox = ({
    total,
    index,
    onIndexChange,
    onClose,
    heading,
    label,
    loading = false,
    error = null,
    children,
}: PractiseLightboxProps) => {
    /** 缩放倍数（1 = 适配窗口） */
    const [zoom, setZoom] = useState(1);

    /** 平移偏移（像素） */
    const [pan, setPan] = useState({ x: 0, y: 0 });

    /** 是否正在拖拽（拖拽时关闭 transform 过渡，保证跟手） */
    const [dragging, setDragging] = useState(false);

    /**
     * 沉浸式模式：
     * 为 true 时隐藏顶部标题栏、底部缩放工具条与左右切换按钮，
     * 只展示图片 / 卡片；再次点击空白区域恢复 UI。
     */
    const [uiHidden, setUiHidden] = useState(false);

    /**
     * 本次按下是否发生过拖拽位移。
     * 用于拖拽结束后不误触"点击空白切换沉浸式"。
     */
    const movedRef = useRef(false);

    /**
     * 沉浸式切换的"空白点"判定层（内容居中容器）。
     * 按下目标必须是它本身才算点击空白，
     * 点在图片 / 卡片上不算。
     */
    const blankRef = useRef<HTMLDivElement>(null);

    /** 本次按下是否落在空白区域（与 movedRef 配合在 pointerup 判定轻点） */
    const blankTapRef = useRef(false);

    const containerRef = useRef<HTMLDivElement>(null);

    /** 拖拽起点与基准偏移 */
    const dragRef = useRef<{
        pointerId: number;
        startX: number;
        startY: number;
        baseX: number;
        baseY: number;
    } | null>(null);

    // 切换图片时重置缩放与平移
    useEffect(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, [index]);

    // 打开期间锁定页面滚动，关闭后恢复
    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previous;
        };
    }, []);

    // 滚轮缩放：原生监听（passive:false）以阻止页面默认滚动
    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const handleWheel = (event: WheelEvent) => {
            event.preventDefault();
            const factor = Math.exp(-event.deltaY * 0.0015);
            setZoom((prev) => clampScale(prev * factor));
        };

        element.addEventListener("wheel", handleWheel, { passive: false });
        return () => element.removeEventListener("wheel", handleWheel);
    }, []);

    // 键盘快捷键
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const isTyping =
                !!target &&
                (target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.isContentEditable);

            switch (event.key) {
                case "Escape":
                    // 沉浸模式下 Esc 优先恢复 UI，UI 可见时 Esc 关闭查看器
                    if (uiHidden) {
                        setUiHidden(false);
                    } else {
                        onClose();
                    }
                    break;
                case "ArrowLeft":
                    if (!isTyping && index > 0) onIndexChange(index - 1);
                    break;
                case "ArrowRight":
                    if (!isTyping && index < total - 1)
                        onIndexChange(index + 1);
                    break;
                case "+":
                case "=":
                    setZoom((prev) => clampScale(prev * 1.25));
                    break;
                case "-":
                case "_":
                    setZoom((prev) => clampScale(prev / 1.25));
                    break;
                case "0":
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                    break;
                default:
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [index, total, onClose, onIndexChange, uiHidden]);

    const resetView = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    // 双击：放大 / 还原（按钮上的双击不触发）
    const handleDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest("button")) return;

        if (zoom > 1.05) {
            resetView();
        } else {
            setZoom(clampScale(2.5));
        }
    };

    // ==================== 拖拽平移 ====================
    const handlePointerDown = (
        event: ReactPointerEvent<HTMLDivElement>
    ) => {
        if (event.button !== 0) return;

        // 左右切换按钮上的按下不作为拖拽起点，保证点击正常
        const target = event.target as HTMLElement | null;
        if (target?.closest("button")) return;

        movedRef.current = false;
        blankTapRef.current = event.target === blankRef.current;

        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            baseX: pan.x,
            baseY: pan.y,
        };

        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
    };

    const handlePointerMove = (
        event: ReactPointerEvent<HTMLDivElement>
    ) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;

        const deltaX = event.clientX - drag.startX;
        const deltaY = event.clientY - drag.startY;

        // 记录发生过有效位移：拖拽后的抬起不再视为"点击空白"
        if (Math.abs(deltaX) + Math.abs(deltaY) > 4) {
            movedRef.current = true;
        }

        setPan({
            x: drag.baseX + deltaX,
            y: drag.baseY + deltaY,
        });
    };

    const handlePointerUp = (
        event: ReactPointerEvent<HTMLDivElement>
    ) => {
        const drag = dragRef.current;
        if (drag && drag.pointerId === event.pointerId) {
            dragRef.current = null;
            setDragging(false);

            // 空白处轻点（按下后没有有效位移）：切换沉浸式。
            // 拖拽使用了 setPointerCapture，后续 click 事件的目标
            // 会被重定向到捕获层，因此这里以"按下 + 抬起"自行判定，
            // 不依赖 click 事件。
            if (!movedRef.current && blankTapRef.current) {
                setUiHidden((prev) => !prev);
            }
        }

        movedRef.current = false;
        blankTapRef.current = false;
    };

    // ==================== 渲染 ====================
    const navButtonClass =
        "h-11 w-11 rounded-full border-0 flex items-center justify-center " +
        "bg-white/10 text-amber-50 text-base cursor-pointer " +
        "hover:bg-white/25 " +
        "transition-[background-color,opacity] duration-300 " +
        "disabled:opacity-30 disabled:cursor-not-allowed";

    const toolButtonClass =
        "h-9 w-9 rounded-full border-0 flex items-center justify-center " +
        "bg-white/10 text-amber-50 text-sm cursor-pointer " +
        "hover:bg-white/25 transition-colors";

    // 沉浸式模式：顶部栏 / 底部工具条 / 左右切换按钮整体淡出，
    // 只保留图片（或卡片），再次点击空白区域恢复。
    // 隐藏用 important 压过按钮自带的 disabled:opacity 变体。
    const uiRevealClass = uiHidden
        ? "opacity-0! pointer-events-none"
        : "opacity-100";

    // 上下两条 UI 栏：隐藏时必须同时折叠高度与内边距，
    // 否则淡出后仍占据布局空间，图片上下留黑边、不算真全屏。
    const topBarClass = uiHidden
        ? "h-0! py-0! opacity-0! pointer-events-none"
        : "h-15 pt-4 pb-2 opacity-100";

    const bottomBarClass = uiHidden
        ? "h-0! py-0! opacity-0! pointer-events-none"
        : "h-16 pt-2 pb-5 opacity-100";

    return createPortal(
        <div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[9999] bg-[#0C0B09]/[0.96] flex flex-col select-none"
        >
            {/* ---------- 顶部：标题 + 序号 + 关闭（沉浸时淡出并折叠高度） ---------- */}
            <div
                className={`flex items-center justify-between gap-4 px-5 shrink-0 overflow-hidden transition-all duration-300 ${topBarClass}`}
            >
                <div className="flex items-baseline gap-3 min-w-0">
                    {heading && (
                        <span className="text-base font-bold font-serif text-amber-50 truncate">
                            {heading}
                        </span>
                    )}
                    {label && (
                        <span className="text-sm text-amber-100/70 truncate">
                            {label}
                        </span>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    title="关闭（Esc）"
                    className={toolButtonClass}
                >
                    <CloseOutlined />
                </button>
            </div>

            {/* ---------- 中部：内容 + 左右切换 ---------- */}
            <div
                className="relative flex-1 min-h-0 overflow-hidden"
                style={{
                    cursor: dragging ? "grabbing" : "grab",
                    touchAction: "none",
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onDoubleClick={handleDoubleClick}
            >
                <button
                    type="button"
                    aria-label="上一张"
                    disabled={index <= 0}
                    onClick={() => onIndexChange(index - 1)}
                    className={`absolute left-4 top-1/2 -translate-y-1/2 z-20 ${navButtonClass} ${uiRevealClass}`}
                >
                    <LeftOutlined />
                </button>

                <button
                    type="button"
                    aria-label="下一张"
                    disabled={index >= total - 1}
                    onClick={() => onIndexChange(index + 1)}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 ${navButtonClass} ${uiRevealClass}`}
                >
                    <RightOutlined />
                </button>

                {/* 空白轻点判定层：点它本身（非内容 / 非按钮）切换沉浸式 */}
                <div
                    ref={blankRef}
                    className="absolute inset-0 flex items-center justify-center"
                >
                    {/* 缩放/平移作用于整体内容，卡片跟随图片一起放大缩小。
                        本层铺满舞台且不吃指针事件（空白点击落到 blankRef 层），
                        内容自身用 pointer-events-auto 恢复交互，
                        这样上下 UI 折叠后图片可撑满整个可视高度 */}
                    <div
                        className="h-full w-full p-3 flex items-center justify-center pointer-events-none"
                        style={{
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            transition: dragging
                                ? "none"
                                : "transform 150ms ease-out",
                            willChange: "transform",
                        }}
                    >
                        {error ? (
                            <div className="px-8 py-6 rounded-lg bg-white/5 border border-white/15 text-center pointer-events-auto">
                                <p className="text-amber-100/80 text-sm">
                                    {error}
                                </p>
                                <p className="text-amber-100/45 text-xs mt-2">
                                    可按 Esc 关闭后重试
                                </p>
                            </div>
                        ) : (
                            children
                        )}
                    </div>

                    {/* 加载动画：内容保持挂载，浮层覆盖；
                        暗沉背景直接复用 MoyouLoading 的 dark 变体（卡其亮色笔画与文案，无底色） */}
                    {loading && !error && (
                        <div className="absolute inset-0 z-10">
                            <MoyouLoading dark tip="正在加载高清大图……" />
                        </div>
                    )}
                </div>
            </div>

            {/* ---------- 底部：缩放工具条 + 全屏开关（沉浸时淡出并折叠高度） ---------- */}
            <div
                className={`flex items-center justify-center gap-2 px-4 shrink-0 overflow-hidden transition-all duration-300 ${bottomBarClass}`}
            >
                <button
                    type="button"
                    title="缩小（-）"
                    onClick={() =>
                        setZoom((prev) => clampScale(prev / 1.25))
                    }
                    className={toolButtonClass}
                >
                    <ZoomOutOutlined />
                </button>

                <button
                    type="button"
                    title="点击复位（0）"
                    onClick={resetView}
                    className="h-9 min-w-16 px-2 rounded-full border-0 bg-white/10 text-amber-50 text-xs cursor-pointer hover:bg-white/25 transition-colors"
                >
                    {Math.round(zoom * 100)}%
                </button>

                <button
                    type="button"
                    title="放大（+）"
                    onClick={() =>
                        setZoom((prev) => clampScale(prev * 1.25))
                    }
                    className={toolButtonClass}
                >
                    <ZoomInOutlined />
                </button>

                <button
                    type="button"
                    title="复位（0）"
                    onClick={resetView}
                    className={toolButtonClass}
                >
                    <AimOutlined />
                </button>

                {/* 沉浸式开关：隐藏 / 恢复顶部栏、底部工具条与左右切换按钮 */}
                <button
                    type="button"
                    title={
                        uiHidden
                            ? "恢复界面（也可点空白或按 Esc）"
                            : "沉浸式观看（也可点空白，再按 Esc 恢复界面）"
                    }
                    onClick={() => setUiHidden((prev) => !prev)}
                    className={toolButtonClass}
                >
                    {uiHidden ? (
                        <FullscreenExitOutlined />
                    ) : (
                        <FullscreenOutlined />
                    )}
                </button>

                <span className="ml-3 hidden sm:block text-xs text-amber-100/40">
                    滚轮缩放 · 拖拽平移 · 双击放大 · ←/→ 切换 · 点空白隐藏界面 · Esc 恢复界面 / 关闭
                </span>
            </div>
        </div>,
        document.body
    );
};

export default PractiseImageLightbox;
