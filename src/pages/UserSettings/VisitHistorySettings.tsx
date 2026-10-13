import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { App, Button, Empty, Input, Pagination, Popconfirm, Spin } from "antd";
import {
    BookOutlined,
    DeleteOutlined,
    EditOutlined,
    EnvironmentOutlined,
    FileOutlined,
    HomeOutlined,
    ReloadOutlined,
    RobotOutlined,
    SearchOutlined,
    UserOutlined,
} from "@ant-design/icons";
import {
    clearMyVisitHistory,
    getMyVisitHistoryPage,
} from "../../services/history/api";

/** pageType 展示配置（取值与 usePageMeta.VisitPageType 前后端约定一致） */
const PAGE_TYPE_META: Record<string, { label: string; icon: ReactNode }> = {
    home: { label: "首页", icon: <HomeOutlined /> },
    copybook_list: { label: "碑帖字库", icon: <BookOutlined /> },
    copybook: { label: "碑帖", icon: <BookOutlined /> },
    practise: { label: "单字临帖", icon: <EditOutlined /> },
    calligrapher_list: { label: "书家列传", icon: <EnvironmentOutlined /> },
    calligrapher: { label: "书法大家", icon: <UserOutlined /> },
    user: { label: "个人主页", icon: <UserOutlined /> },
    search: { label: "搜索", icon: <SearchOutlined /> },
    agent: { label: "小墨Agent", icon: <RobotOutlined /> },
};

/** "2026-10-13 09:51:00" / ISO "2026-10-13T09:51:00" → yyyy-MM-dd */
const dayOf = (value?: string) =>
    String(value ?? "").replace("T", " ").slice(0, 10);

/** 时间展示：记录已按日期分组，行内只保留 HH:mm */
const timeOf = (value?: string) =>
    String(value ?? "").replace("T", " ").slice(11, 16);

/** 本地时区的 yyyy-MM-dd */
const localDayKey = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
};

/**
 * 个人中心 · 浏览历史
 *
 * 数据来源 visit_history 表：各内容页通过 usePageMeta 上报
 * page_title / page_path / page_type / target_id，
 * 点击记录行按 page_path 直接跳回对应页面。
 *
 * 功能：
 *   · 标题搜索（后端按 page_title 模糊匹配，回车或清空时生效）
 *   · 清空历史（Popconfirm 二次确认）/ 刷新
 *   · 按日期分组：当天显示「今天」，其余显示具体日期
 *   · 分页展示（默认每页 10 条）
 *   · 记录仅保存 60 天（后端查询过滤 + 定时清理）
 */
const VisitHistorySettings = () => {
    const navigate = useNavigate();
    const { message } = App.useApp();

    const [records, setRecords] = useState<API.VisitHistoryItem[]>([]);
    const [total, setTotal] = useState(0);
    const [current, setCurrent] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    /** 搜索框输入值 / 实际生效关键词（回车或清空时生效） */
    const [keywordInput, setKeywordInput] = useState("");
    const [keyword, setKeyword] = useState("");

    const [loading, setLoading] = useState(true);

    /** 手动刷新信号（清空后也通过它强制重新拉取） */
    const [refreshToken, setRefreshToken] = useState(0);

    // ==================== 数据加载 ====================
    useEffect(() => {
        let cancelled = false;

        setLoading(true);

        getMyVisitHistoryPage({
            current,
            pageSize,
            keyword: keyword || undefined,
        })
            .then((res: any) => {
                if (cancelled) return;
                if (res.code === 200) {
                    setRecords(res.data?.records || []);
                    setTotal(res.data?.total || 0);
                } else if (res.code === 4001) {
                    message.info("请先登录");
                    navigate("/login");
                }
            })
            .catch(() => {
                // 加载失败保持空列表，不伪造数据
                if (!cancelled) {
                    setRecords([]);
                    setTotal(0);
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current, pageSize, keyword, refreshToken]);

    // ==================== 操作 ====================
    /** 使关键词生效并回到第一页 */
    const applyKeyword = (value: string) => {
        const next = value.trim();
        setKeyword(next);
        setCurrent(1);
    };

    const handleClear = () => {
        clearMyVisitHistory()
            .then((res: any) => {
                if (res.code === 200) {
                    message.success("已清空浏览历史");
                    setKeyword("");
                    setKeywordInput("");
                    setCurrent(1);
                    setRefreshToken((token) => token + 1);
                } else {
                    message.error(res.message || "清空失败，请稍后重试");
                }
            })
            .catch(() => {
                message.error("清空失败，请稍后重试");
            });
    };

    // ==================== 日期分组 ====================
    /** 按日期归类：当天 → 「今天」，其余日期显示具体日期（后端已按时间倒序） */
    const groups = useMemo(() => {
        const map = new Map<string, API.VisitHistoryItem[]>();

        records.forEach((item) => {
            const day = dayOf(item.createTime) || "未知日期";
            const bucket = map.get(day);
            if (bucket) {
                bucket.push(item);
            } else {
                map.set(day, [item]);
            }
        });

        const today = localDayKey(new Date());

        return [...map.entries()].map(([day, items]) => ({
            label: day === today ? "今天" : day,
            items,
        }));
    }, [records]);

    // ==================== 渲染 ====================
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-6">
            {/* 卡片头：标题 + 搜索 / 清空历史 / 刷新 */}
            <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
                <h2 className="text-lg font-bold text-[#3F332A]">浏览历史</h2>

                <div className="flex items-center gap-2">
                    <Input
                        prefix={
                            <SearchOutlined className="text-gray-400" />
                        }
                        placeholder="搜索标题..."
                        allowClear
                        value={keywordInput}
                        onChange={(e) => {
                            setKeywordInput(e.target.value);
                            // 点 allowClear 清空时立即恢复全量列表
                            if (!e.target.value) {
                                applyKeyword("");
                            }
                        }}
                        onPressEnter={() => applyKeyword(keywordInput)}
                        className="!w-56"
                    />

                    <Popconfirm
                        title="确定清空全部浏览历史？"
                        description="清空后不可恢复"
                        okText="清空"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                        onConfirm={handleClear}
                    >
                        <Button danger icon={<DeleteOutlined />}>
                            清空历史
                        </Button>
                    </Popconfirm>

                    <Button
                        icon={<ReloadOutlined />}
                        onClick={() => setRefreshToken((token) => token + 1)}
                    >
                        刷新
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="py-16 text-center">
                    <Spin size="large" />
                </div>
            ) : records.length === 0 ? (
                <div className="py-16">
                    <Empty
                        description={
                            keyword ? `没有标题包含「${keyword}」的浏览记录` : "暂无浏览记录"
                        }
                    />
                </div>
            ) : (
                <>
                    {/* 按日期分组展示 */}
                    {groups.map((group) => (
                        <div key={group.label}>
                            {/* 日期分组头：标签 + 条数 */}
                            <div className="flex items-baseline gap-2 mt-6 mb-2 px-1">
                                <span className="text-sm font-semibold text-[#964328]">
                                    {group.label}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {group.items.length} 条
                                </span>
                            </div>

                            <div className="rounded-xl border border-gray-100 divide-y divide-gray-100">
                                {group.items.map((item) => {
                                    const meta =
                                        PAGE_TYPE_META[item.pageType];

                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() =>
                                                navigate(item.pagePath)
                                            }
                                            className="w-full flex items-center gap-4 px-5 py-4 text-left cursor-pointer border-0 bg-transparent hover:bg-gray-50 transition-colors"
                                        >
                                            {/* 页面类型图标 */}
                                            <span className="w-9 h-9 shrink-0 rounded-lg bg-[#964328]/8 text-[#964328] flex items-center justify-center text-base">
                                                {meta?.icon || <FileOutlined />}
                                            </span>

                                            {/* 页面名称 + 类型 · 路径 */}
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-sm text-gray-800 truncate">
                                                    {item.pageTitle}
                                                </span>
                                                <span className="block text-xs text-gray-400 truncate mt-0.5">
                                                    {meta?.label ||
                                                        item.pageType}{" "}
                                                    · {item.pagePath}
                                                </span>
                                            </span>

                                            {/* 浏览时间（日期已在分组头展示） */}
                                            <span className="shrink-0 text-xs text-gray-400">
                                                {timeOf(item.createTime)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* 分页：居中 + 小号圆形页码（.theme-pagination 全局主题样式） */}
                    <div className="mt-6 flex justify-center">
                        <Pagination
                            className="theme-pagination"
                            current={current}
                            pageSize={pageSize}
                            total={total}
                            showSizeChanger
                            showQuickJumper
                            pageSizeOptions={[10, 20, 50]}
                            showTotal={(count, range) =>
                                `显示第 ${range[0]}-${range[1]} 条，共 ${count} 条记录`
                            }
                            onChange={(page, size) => {
                                setCurrent(page);
                                setPageSize(size);
                            }}
                        />
                    </div>
                </>
            )}
        </div>
    );
};

export default VisitHistorySettings;
