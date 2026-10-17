import { useEffect, useRef, useState } from "react";
import { CloseCircleFilled, SearchOutlined } from "@ant-design/icons";

/** 输入去抖间隔（毫秒）：本地过滤无需过快，也避免逐字重排列表 */
const DEBOUNCE_MS = 250;

type TabSearchBarProps = {
    /** 展开后的输入提示，随当前一级导航变化 */
    placeholder?: string;
    /**
     * 关键字变化回调（已 trim）
     *
     * 仅用于当前 tab 已加载列表的原地过滤，不触发路由跳转；
     * 清空时回调 ""，调用方据此恢复完整列表。
     */
    onKeywordChange: (keyword: string) => void;
    /** 变化即收起并清空关键字，用于切换导航时重置搜索 */
    resetKey?: string | number;
};

/**
 * 个人主页一级导航行右侧的搜索框
 *
 * 默认只呈现一个搜索图标，点击后原地展开输入框；
 * 输入为空时失焦或按 Esc 自动收起，恢复为纯图标。
 *
 * 只做"当前 tab 内容"的本地过滤，不请求接口、不打开新页面。
 * 配色沿用个人主页的米白 / 赭红体系。
 */
const TabSearchBar = ({
    placeholder = "搜索",
    onKeywordChange,
    resetKey,
}: TabSearchBarProps) => {
    const [expanded, setExpanded] = useState(false);
    const [value, setValue] = useState("");

    const inputRef = useRef<HTMLInputElement>(null);
    /** 回调用 ref 持有，避免父组件每次渲染都重置搜索框 */
    const onKeywordChangeRef = useRef(onKeywordChange);
    onKeywordChangeRef.current = onKeywordChange;
    /** 首次挂载不执行重置逻辑 */
    const mountedRef = useRef(false);

    // 切换导航：清空关键字（去抖后会把 "" 回传给父组件，列表随之恢复）
    useEffect(() => {
        if (!mountedRef.current) {
            mountedRef.current = true;
            return;
        }
        setValue("");
        setExpanded(false);
    }, [resetKey]);

    // 去抖上报
    useEffect(() => {
        const timer = window.setTimeout(() => {
            onKeywordChangeRef.current(value.trim());
        }, DEBOUNCE_MS);

        return () => window.clearTimeout(timer);
    }, [value]);

    const handleExpand = () => {
        setExpanded(true);
        // 等展开渲染完成后再聚焦
        window.setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleClear = () => {
        setValue("");
        inputRef.current?.focus();
    };

    const handleBlur = () => {
        // 有关键字时保持展开，避免列表在用户阅读结果时突然变宽/变窄
        if (!value.trim()) setExpanded(false);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Escape") {
            setValue("");
            setExpanded(false);
        }
    };

    if (!expanded) {
        return (
            <button
                type="button"
                onClick={handleExpand}
                aria-label="搜索"
                title="搜索"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#964328]/15 bg-white/60 text-[#756B61] transition-all duration-200 hover:border-[#964328]/40 hover:text-[#964328] active:scale-95"
            >
                <SearchOutlined className="text-sm" />
            </button>
        );
    }

    return (
        <div className="profile-fade-in flex h-9 w-44 shrink-0 items-center gap-2 rounded-full border border-[#964328]/30 bg-[#F8F0E2] px-3 sm:w-60">
            <SearchOutlined className="shrink-0 text-xs text-[#9A7440]" />
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                placeholder={placeholder}
                aria-label="搜索"
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#3F332A] outline-none placeholder:text-[#A89680]"
            />
            {value && (
                <button
                    type="button"
                    onClick={handleClear}
                    aria-label="清空搜索"
                    title="清空"
                    className="flex shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-xs text-[#9A7440]/70 transition-colors hover:text-[#964328]"
                >
                    <CloseCircleFilled />
                </button>
            )}
        </div>
    );
};

export default TabSearchBar;
