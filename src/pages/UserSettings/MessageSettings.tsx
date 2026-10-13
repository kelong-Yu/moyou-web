import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
    App,
    Badge,
    Button,
    Empty,
    Modal,
    Pagination,
    Spin,
    Tabs,
} from "antd";
import { CheckOutlined } from "@ant-design/icons";
import UserAvatar from "../../components/UserAvatar";
import {
    getMyAnnouncementMessages,
    getMyCommentInteractions,
    getMyComments,
    getMessageUnreadCounts,
    markAllMessagesRead,
    markMessageRead,
} from "../../services/message/api";

/** 后端分页：默认每页 10 条 */
const PAGE_SIZE = 10;

type TabKey = "announcement" | "comment" | "mycomment";

/** 单个 Tab 的独立列表状态（两个 Tab 各自维护分页，互不混用） */
interface ListState<T> {
    records: T[];
    total: number;
    current: number;
    loading: boolean;
    /** 是否已完成过一次加载（切换 Tab 时避免重复请求首屏） */
    loaded: boolean;
}

const EMPTY_LIST: ListState<never> = {
    records: [],
    total: 0,
    current: 1,
    loading: false,
    loaded: false,
};

/** 时间展示：兼容 "yyyy-MM-dd HH:mm:ss" 与 ISO 格式 */
const formatTime = (value?: string) =>
    !value ? "" : String(value).replace("T", " ").slice(0, 16);

/** 已读/未读小标签 */
const ReadTag = ({ read }: { read?: boolean }) => (
    <span
        className={`shrink-0 text-xs px-1.5 py-0.5 rounded ${
            read
                ? "text-gray-400 bg-gray-100"
                : "text-[#964328] bg-[#964328]/10 font-medium"
        }`}
    >
        {read ? "已读" : "未读"}
    </span>
);

/**
 * 个人中心 · 我的消息
 *
 * 三个 Tab（各自独立分页状态）：
 *   · 系统通知 —— 复用 announcement 表已发布公告（后端 /message/announcements 分页），
 *     已读状态为当前用户私有（message_read 联查），点击查看弹窗并标记已读；
 *   · 互动消息 —— 复用 copybook_comment 的明确回复关系（reply_user_id = 我），
 *     点击标记已读并跳转到对应碑帖详情页、定位该条回复；
 *   · 我的评论 —— 当前用户发表的全部评论（含自己回复自己），仅查看与跳转定位，
 *     无已读/未读概念。
 *
 * 右侧「全部已读」一次性清空系统通知与互动消息两类未读（后端仅操作当前登录用户）。
 */
const MessageSettings = () => {
    const navigate = useNavigate();
    const { message } = App.useApp();

    const [activeTab, setActiveTab] = useState<TabKey>("announcement");
    const [unread, setUnread] = useState<API.MessageUnreadCounts>({
        announcementUnread: 0,
        commentUnread: 0,
    });

    // 三个 Tab 各自独立的分页/加载状态
    const [ann, setAnn] = useState<ListState<API.MessageAnnouncementItem>>(
        EMPTY_LIST
    );
    const [cmt, setCmt] = useState<ListState<API.MessageCommentItem>>(
        EMPTY_LIST
    );
    const [my, setMy] = useState<ListState<API.MessageMyCommentItem>>(
        EMPTY_LIST
    );

    /** 公告详情弹窗 */
    const [detail, setDetail] = useState<API.MessageAnnouncementItem | null>(
        null
    );

    // ==================== 数据加载 ====================
    const refreshCounts = () => {
        getMessageUnreadCounts()
            .then((res: any) => {
                if (res.code === 200 && res.data) setUnread(res.data);
            })
            .catch(() => {
                // 角标刷新失败静默，不打断浏览
            });
    };

    const loadAnnouncements = (page: number) => {
        setAnn((prev) => ({ ...prev, loading: true }));

        getMyAnnouncementMessages({ current: page, pageSize: PAGE_SIZE })
            .then((res: any) => {
                if (res.code === 200) {
                    setAnn({
                        records: res.data?.records || [],
                        total: res.data?.total || 0,
                        current: page,
                        loading: false,
                        loaded: true,
                    });
                } else {
                    setAnn((prev) => ({ ...prev, loading: false }));
                    message.error(res.message || "系统通知加载失败");
                }
            })
            .catch(() => {
                setAnn((prev) => ({ ...prev, loading: false }));
                message.error("系统通知加载失败，请稍后重试");
            });
    };

    const loadCommentInteractions = (page: number) => {
        setCmt((prev) => ({ ...prev, loading: true }));

        getMyCommentInteractions({ current: page, pageSize: PAGE_SIZE })
            .then((res: any) => {
                if (res.code === 200) {
                    setCmt({
                        records: res.data?.records || [],
                        total: res.data?.total || 0,
                        current: page,
                        loading: false,
                        loaded: true,
                    });
                } else {
                    setCmt((prev) => ({ ...prev, loading: false }));
                    message.error(res.message || "互动消息加载失败");
                }
            })
            .catch(() => {
                setCmt((prev) => ({ ...prev, loading: false }));
                message.error("互动消息加载失败，请稍后重试");
            });
    };

    /** 我的评论：仅查看，无已读/未读 */
    const loadMyComments = (page: number) => {
        setMy((prev) => ({ ...prev, loading: true }));

        getMyComments({ current: page, pageSize: PAGE_SIZE })
            .then((res: any) => {
                if (res.code === 200) {
                    setMy({
                        records: res.data?.records || [],
                        total: res.data?.total || 0,
                        current: page,
                        loading: false,
                        loaded: true,
                    });
                } else {
                    setMy((prev) => ({ ...prev, loading: false }));
                    message.error(res.message || "我的评论加载失败");
                }
            })
            .catch(() => {
                setMy((prev) => ({ ...prev, loading: false }));
                message.error("我的评论加载失败，请稍后重试");
            });
    };

    useEffect(() => {
        refreshCounts();
        loadAnnouncements(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleTabChange = (key: TabKey) => {
        setActiveTab(key);
        // 首次切到某 Tab 时才拉取其第一页，之后保留各自分页状态
        if (key === "announcement" && !ann.loaded) loadAnnouncements(1);
        if (key === "comment" && !cmt.loaded) loadCommentInteractions(1);
        if (key === "mycomment" && !my.loaded) loadMyComments(1);
    };

    // ==================== 已读操作 ====================
    /** 打开公告详情：同时标记该公告为当前用户已读 */
    const openAnnouncement = (item: API.MessageAnnouncementItem) => {
        setDetail(item);

        if (!item.read) {
            markMessageRead("announcement", item.id).catch(() => {});
            setAnn((prev) => ({
                ...prev,
                records: prev.records.map((r) =>
                    r.id === item.id ? { ...r, read: true } : r
                ),
            }));
            setUnread((prev) => ({
                ...prev,
                announcementUnread: Math.max(0, prev.announcementUnread - 1),
            }));
        }
    };

    /** 点击评论互动：标记已读并跳转碑帖详情页定位该回复 */
    const openComment = (item: API.MessageCommentItem) => {
        if (!item.read) {
            markMessageRead("comment", item.id).catch(() => {});
            setCmt((prev) => ({
                ...prev,
                records: prev.records.map((r) =>
                    r.id === item.id ? { ...r, read: true } : r
                ),
            }));
            setUnread((prev) => ({
                ...prev,
                commentUnread: Math.max(0, prev.commentUnread - 1),
            }));
        }

        navigate(`/copybook/${item.copybookId}?commentId=${item.id}`);
    };

    /** 全部已读：两类消息一次性清空未读 */
    const handleReadAll = () => {
        markAllMessagesRead()
            .then((res: any) => {
                if (res.code === 200) {
                    if (!res.data) {
                        message.info("暂无未读消息");
                        return;
                    }
                    message.success(`已将 ${res.data} 条消息标记为已读`);
                    setAnn((prev) => ({
                        ...prev,
                        records: prev.records.map((r) => ({
                            ...r,
                            read: true,
                        })),
                    }));
                    setCmt((prev) => ({
                        ...prev,
                        records: prev.records.map((r) => ({
                            ...r,
                            read: true,
                        })),
                    }));
                    setUnread({ announcementUnread: 0, commentUnread: 0 });
                } else {
                    message.error(res.message || "操作失败，请稍后重试");
                }
            })
            .catch(() => {
                message.error("操作失败，请稍后重试");
            });
    };

    // ==================== 渲染 ====================
    /** 分页条（两个 Tab 各自调用，pageSize 固定 10） */
    const renderPagination = (
        state: ListState<unknown>,
        onLoad: (page: number) => void
    ) =>
        state.total > 0 ? (
            <div className="mt-5 flex justify-center">
                <Pagination
                    className="theme-pagination"
                    current={state.current}
                    pageSize={PAGE_SIZE}
                    total={state.total}
                    showSizeChanger={false}
                    showTotal={(count, range) =>
                        `显示第 ${range[0]}-${range[1]} 条，共 ${count} 条`
                    }
                    onChange={(page) => onLoad(page)}
                />
            </div>
        ) : null;

    /** 列表容器：加载/空/内容 三态 */
    const renderListBody = (
        state: ListState<unknown>,
        emptyText: string,
        content: ReactNode
    ) => {
        if (state.loading) {
            return (
                <div className="py-16 text-center">
                    <Spin size="large" />
                </div>
            );
        }
        if (state.records.length === 0) {
            return (
                <div className="py-16">
                    <Empty description={emptyText} />
                </div>
            );
        }
        return content;
    };

    const announcementList = renderListBody(
        ann,
        "暂无系统通知",
        <>
            <div className="mt-2 rounded-xl border border-gray-100 divide-y divide-gray-100">
                {ann.records.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => openAnnouncement(item)}
                        className="w-full flex items-start gap-3 px-5 py-4 text-left cursor-pointer border-0 bg-transparent hover:bg-gray-50 transition-colors"
                    >
                        {/* 未读红点 */}
                        <span
                            className={`mt-2 w-1.5 h-1.5 shrink-0 rounded-full ${
                                item.read ? "bg-transparent" : "bg-[#964328]"
                            }`}
                        />

                        <span className="flex-1 min-w-0">
                            <span className="flex items-center gap-2">
                                <span
                                    className={`flex-1 min-w-0 truncate text-sm ${
                                        item.read
                                            ? "text-gray-500"
                                            : "text-gray-900 font-semibold"
                                    }`}
                                >
                                    {item.title}
                                </span>
                                <ReadTag read={item.read} />
                                <time className="shrink-0 text-xs text-gray-400">
                                    {formatTime(item.publishTime)}
                                </time>
                            </span>
                            {/* 内容摘要（点击弹窗看全文） */}
                            <span className="block mt-1.5 text-xs text-gray-500 leading-5 line-clamp-2">
                                {item.content}
                            </span>
                        </span>
                    </button>
                ))}
            </div>
            {renderPagination(ann, loadAnnouncements)}
        </>
    );

    const commentList = renderListBody(
        cmt,
        "暂无互动消息",
        <>
            <div className="mt-2 rounded-xl border border-gray-100 divide-y divide-gray-100">
                {cmt.records.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => openComment(item)}
                        className="w-full flex items-start gap-3 px-5 py-4 text-left cursor-pointer border-0 bg-transparent hover:bg-gray-50 transition-colors"
                    >
                        {/* 未读红点 */}
                        <span
                            className={`mt-5 w-1.5 h-1.5 shrink-0 rounded-full ${
                                item.read ? "bg-transparent" : "bg-[#964328]"
                            }`}
                        />

                        <UserAvatar
                            size={36}
                            src={item.fromAvatarUrl}
                            account={item.fromUsername}
                            className="shrink-0 font-semibold"
                        />

                        <span className="flex-1 min-w-0">
                            <span className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-[#70311e] truncate max-w-40">
                                    {item.fromUsername}
                                </span>
                                <span className="text-xs text-gray-500">
                                    回复了你的评论
                                </span>
                                <ReadTag read={item.read} />
                                <time className="ml-auto text-xs text-gray-400 shrink-0">
                                    {formatTime(item.createTime)}
                                </time>
                            </span>

                            {/* 对方的回复内容（截断，点击查看完整） */}
                            <span className="block mt-1.5 text-sm text-gray-700 leading-6 line-clamp-3">
                                {item.content}
                            </span>

                            {/* 引用：我的原始评论（浅色底与回复区分） */}
                            <span className="block mt-2 rounded-lg bg-[#F7F0E2]/70 border border-[#964328]/8 px-3 py-2 text-xs text-gray-500 leading-5 line-clamp-2">
                                我的评论：{item.originCommentContent || "该评论已删除"}
                            </span>

                            <span className="block mt-1.5 text-xs text-[#964328]/80 truncate">
                                来自碑帖：《{item.copybookName}》
                            </span>
                        </span>
                    </button>
                ))}
            </div>
            {renderPagination(cmt, loadCommentInteractions)}
        </>
    );

    /** 我的评论：自己的全部留言（含自己回复自己），点击查看，无已读状态 */
    const myCommentList = renderListBody(
        my,
        "还没有发表过评论",
        <>
            <div className="mt-2 rounded-xl border border-gray-100 divide-y divide-gray-100">
                {my.records.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                            navigate(
                                `/copybook/${item.copybookId}?commentId=${item.id}`
                            )
                        }
                        className="w-full flex items-start gap-3 px-5 py-4 text-left cursor-pointer border-0 bg-transparent hover:bg-gray-50 transition-colors"
                    >
                        <span className="flex-1 min-w-0">
                            <span className="flex items-center gap-2">
                                <span className="flex-1 min-w-0 truncate text-sm font-medium text-gray-900">
                                    《{item.copybookName}》
                                </span>
                                <time className="shrink-0 text-xs text-gray-400">
                                    {formatTime(item.createTime)}
                                </time>
                            </span>

                            {/* 我发表的评论内容（截断，点击查看完整） */}
                            <span className="block mt-1.5 text-sm text-gray-700 leading-6 line-clamp-3">
                                {item.content}
                            </span>

                            {/* 回复场景：引用被回复的评论 */}
                            {item.parentId ? (
                                <span className="block mt-2 rounded-lg bg-[#F7F0E2]/70 border border-[#964328]/8 px-3 py-2 text-xs text-gray-500 leading-5 line-clamp-2">
                                    回复 @{item.replyUsername || "已注销用户"}
                                    ：{item.originCommentContent || "该评论已删除"}
                                </span>
                            ) : null}
                        </span>
                    </button>
                ))}
            </div>
            {renderPagination(my, loadMyComments)}
        </>
    );

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-6">
            {/* 头部第一行：标题 + 全部已读（右侧） */}
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-[#3F332A] shrink-0">
                    我的消息
                </h2>

                <Button
                    icon={<CheckOutlined />}
                    onClick={handleReadAll}
                    className="!border-[#964328]/40 !text-[#964328] hover:!border-[#964328] hover:!text-[#964328]"
                >
                    全部已读
                </Button>
            </div>

            {/* 头部第二行：Tab 栏（标题下方），ink bar / 选中文字 / 未读角标均为主题红 */}
            <div className="settings-message-tabs mt-1">
                <Tabs
                    activeKey={activeTab}
                    onChange={(key) => handleTabChange(key as TabKey)}
                    tabBarStyle={{ marginBottom: 0 }}
                    items={[
                        {
                            key: "announcement",
                            label: (
                                <Badge
                                    count={unread.announcementUnread}
                                    color="#964328"
                                    size="small"
                                    offset={[6, -2]}
                                >
                                    <span className="px-1">系统通知</span>
                                </Badge>
                            ),
                        },
                        {
                            key: "comment",
                            label: (
                                <Badge
                                    count={unread.commentUnread}
                                    color="#964328"
                                    size="small"
                                    offset={[6, -2]}
                                >
                                    <span className="px-1">互动消息</span>
                                </Badge>
                            ),
                        },
                        {
                            key: "mycomment",
                            label: <span className="px-1">我的评论</span>,
                        },
                    ]}
                />
            </div>

            {/* 列表区 */}
            {activeTab === "announcement" && announcementList}
            {activeTab === "comment" && commentList}
            {activeTab === "mycomment" && myCommentList}

            {/* 公告详情弹窗 */}
            <Modal
                open={!!detail}
                title={detail?.title}
                footer={null}
                onCancel={() => setDetail(null)}
                width={560}
            >
                <p className="text-xs text-gray-400 mb-3">
                    发布时间：{formatTime(detail?.publishTime)}
                </p>
                <div className="text-sm text-gray-700 leading-7 whitespace-pre-wrap wrap-break-word max-h-96 overflow-auto">
                    {detail?.content}
                </div>
            </Modal>
        </div>
    );
};

export default MessageSettings;
