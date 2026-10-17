import type { ReactNode } from "react";
import { Button, Empty, Pagination } from "antd";
import MoyouLoading from "../../../components/MoyouLoading";

type FollowListPanelProps = {
    /** 首屏 / 翻页加载中 */
    loading: boolean;

    /** 请求失败或返回形状不符时的提示文案；null 表示无错误 */
    error: string | null;

    /** 后端尚未返回分页体，分页由前端临时切片 */
    degraded: boolean;

    total: number;

    pageNum: number;

    pageSize: number;

    /** 是否处于搜索状态（关键字非空） */
    searching: boolean;

    /** 本页实际渲染的行数，用于区分"空列表"与"全是占位行" */
    visibleCount: number;

    loadingTip: string;

    /** 未搜索且列表为空时的文案 */
    emptyDescription: string;

    /** 搜索且本页无匹配时的文案 */
    searchEmptyDescription: string;

    /** 列表行（由调用方按条目类型渲染） */
    children: ReactNode;

    onPageChange: (page: number) => void;

    onRetry: () => void;

    /** 提供后，搜索无结果时会展示"清除搜索"入口 */
    onClearSearch?: () => void;
};

/**
 * 关注 / 粉丝列表的分页容器
 *
 * 统一负责四种形态，任何一条路径都有内容，不会出现空白区域：
 *   loading → MoyouLoading 占位（固定高度，翻页时不塌陷）
 *   error   → Empty + 重新加载按钮
 *   空      → Empty；搜索状态下额外给出"清除搜索"出口
 *   有数据   → children
 *
 * 分页控件复用全站主题样式 .theme-pagination（赭红实心当前页），不自造控件。
 * 分页条在加载期间保持可见，避免布局上下跳动。
 */
const FollowListPanel = ({
    loading,
    error,
    degraded,
    total,
    pageNum,
    pageSize,
    searching,
    visibleCount,
    loadingTip,
    emptyDescription,
    searchEmptyDescription,
    children,
    onPageChange,
    onRetry,
    onClearSearch,
}: FollowListPanelProps) => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const showPagination = total > pageSize;

    return (
        <div className="mb-8">
            {/* 降级说明：后端分页未就绪时如实告知，不做静默兜底 */}
            {degraded && !loading && !error && (
                <div className="mb-4 rounded border border-[#C7A16A]/40 bg-[#FBF3E4] px-3 py-2 text-xs leading-relaxed text-[#8C6049]">
                    后端分页接口尚未就绪（当前返回完整列表），分页暂由前端按页切片，
                    接口切换为服务端分页后此处自动恢复。
                </div>
            )}

            {/*
               计数：关键字已下发后端，所以搜索时 total 就是命中总数，
               不再是"当前页里匹配了几条"，措辞要跟着变。
            */}
            {!loading && !error && total > 0 && (
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 px-2 text-xs text-[#8B8178]">
                    <span>
                        {searching ? `匹配 ${total} 条` : `共 ${total} 条`} · 第{" "}
                        {pageNum}/{totalPages} 页
                    </span>
                </div>
            )}

            {loading ? (
                <div className="h-64">
                    <MoyouLoading tip={loadingTip} />
                </div>
            ) : error ? (
                <div className="py-16 text-center">
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={error}
                    />
                    <Button className="mt-4" onClick={onRetry}>
                        重新加载
                    </Button>
                </div>
            ) : visibleCount === 0 ? (
                <div className="py-16 text-center">
                    <Empty
                        description={
                            searching ? searchEmptyDescription : emptyDescription
                        }
                    />
                    {searching && onClearSearch && (
                        <Button className="mt-4" onClick={onClearSearch}>
                            清除搜索
                        </Button>
                    )}
                </div>
            ) : (
                <div className="px-2">{children}</div>
            )}

            {showPagination && (
                <div className="mt-6 flex justify-center">
                    <Pagination
                        className="theme-pagination"
                        current={pageNum}
                        total={total}
                        pageSize={pageSize}
                        showSizeChanger={false}
                        showTotal={(count) => `共 ${count} 条`}
                        onChange={onPageChange}
                    />
                </div>
            )}
        </div>
    );
};

export default FollowListPanel;
