import { App, Button, Empty, Input, Modal, Popconfirm, Spin } from "antd";
import { MessageOutlined, SendOutlined, DownOutlined, UpOutlined, EditOutlined } from "@ant-design/icons";
import UserAvatar from "../UserAvatar";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../stores";
import { createCopybookComment, deleteCopybookComment, getCopybookComments, reportComment } from "../../services/comment/api";

interface CommentSectionProps {
    copybookId?: number;
    onCommentCreated?: () => void | Promise<void>;
    /**
     * 需要定位并高亮的评论ID
     * （从「我的消息 · 评论互动」跳转详情页时通过 ?commentId= 传入）
     */
    focusCommentId?: number;
}

const formatTime = (value?: string) => {
    if (!value) return "刚刚";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value.replace("T", " ").slice(0, 16)
        : date.toLocaleString("zh-CN", { hour12: false, month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const CommentSection: React.FC<CommentSectionProps> = ({ copybookId, onCommentCreated, focusCommentId }) => {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const currentUser = useSelector((state: RootState) => state.user.userInfo);
    const [comments, setComments] = useState<API.WebCopybookCommentResponse[]>([]);
    const [total, setTotal] = useState(0);
    const [content, setContent] = useState("");
    /** 内联回复：当前正在回复的评论ID / 回复内容 / 提交中 */
    const [inlineReplyId, setInlineReplyId] = useState<number | null>(null);
    const [inlineReplyContent, setInlineReplyContent] = useState("");
    const [inlineSubmitting, setInlineSubmitting] = useState(false);
    const [loadedCopybookId, setLoadedCopybookId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
    
    // 新增：默认折叠评论输入框
    const [isCollapsed, setIsCollapsed] = useState(true);

    /** 消息跳转定位时短暂高亮的评论ID */
    const [highlightedId, setHighlightedId] = useState<number | null>(null);

    /** 举报弹窗：被举报评论 / 举报原因 / 提交中（防重复提交） */
    const [reportTarget, setReportTarget] =
        useState<API.WebCopybookCommentResponse | null>(null);
    const [reportReason, setReportReason] = useState("");
    const [reporting, setReporting] = useState(false);

    const loadComments = async (id: number) => {
        const res = await getCopybookComments(id, { current: 1, pageSize: 20 });
        if (res.code === 200) {
            setComments(res.data.records || []);
            setTotal(res.data.total || 0);
            setLoadedCopybookId(id);
        }
    };

    useEffect(() => {
        if (!copybookId) return;
        let cancelled = false;

        const load = async () => {
            try {
                const res = await getCopybookComments(copybookId, { current: 1, pageSize: 20 });
                if (!cancelled && res.code === 200) {
                    setComments(res.data.records || []);
                    setTotal(res.data.total || 0);
                    setLoadedCopybookId(copybookId);
                }
            } catch (error) {
                console.error("获取评论失败", error);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [copybookId]);

    const loading = !copybookId || loadedCopybookId !== copybookId;

    /**
     * 消息跳转定位：评论加载完成后，滚动到目标回复并短暂高亮。
     * 依赖 comments/loading，确保 DOM 渲染出锚点后再执行。
     */
    useEffect(() => {
        if (!focusCommentId || loading) return;

        const timer = window.setTimeout(() => {
            const el = document.getElementById(`copybook-comment-${focusCommentId}`);
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                setHighlightedId(focusCommentId);
                window.setTimeout(() => setHighlightedId(null), 3000);
            }
        }, 200);

        return () => window.clearTimeout(timer);
    }, [focusCommentId, loading, comments]);

    const handleSubmit = async () => {
        if (!copybookId || submitting) return;
        const trimmedContent = content.trim();
        if (!trimmedContent) {
            message.warning("请输入评论内容");
            return;
        }
        if (!localStorage.getItem("token")) {
            message.info("请先登录后再发表评论");
            navigate("/login");
            return;
        }

        setSubmitting(true);
        try {
            const res = await createCopybookComment(copybookId, {
                content: trimmedContent,
            });
            if (res.code === 4001) {
                message.info("登录已过期，请重新登录");
                navigate("/login");
                return;
            }
            if (res.code !== 200) {
                message.error(res.message || "发布评论失败");
                return;
            }

            setContent("");
            await loadComments(copybookId);
            await onCommentCreated?.();
            message.success("评论发布成功");
        } catch (error) {
            console.error("发布评论失败", error);
            message.error("网络异常，请稍后重试");
        } finally {
            setSubmitting(false);
        }
    };

    /** 内联回复：直接回复指定评论（parentId=该评论ID），提交后就地刷新 */
    const handleInlineReply = async (comment: API.WebCopybookCommentResponse) => {
        if (!copybookId || inlineSubmitting) return;
        const trimmed = inlineReplyContent.trim();
        if (!trimmed) {
            message.warning("请输入回复内容");
            return;
        }
        if (!localStorage.getItem("token")) {
            message.info("请先登录后再回复");
            navigate("/login");
            return;
        }

        setInlineSubmitting(true);
        try {
            const res = await createCopybookComment(copybookId, {
                content: trimmed,
                parentId: comment.id,
            });
            if (res.code === 4001) {
                message.info("登录已过期，请重新登录");
                navigate("/login");
                return;
            }
            if (res.code !== 200) {
                message.error(res.message || "回复失败");
                return;
            }

            setInlineReplyId(null);
            setInlineReplyContent("");
            await loadComments(copybookId);
            await onCommentCreated?.();
            message.success("回复成功");
        } catch (error) {
            console.error("回复失败", error);
            message.error("网络异常，请稍后重试");
        } finally {
            setInlineSubmitting(false);
        }
    };

    const handleDelete = async (comment: API.WebCopybookCommentResponse) => {
        if (!copybookId || deletingCommentId !== null) return;

        setDeletingCommentId(comment.id);
        try {
            const res = await deleteCopybookComment(copybookId, comment.id);
            if (res.code === 4001) {
                message.info("登录已过期，请重新登录");
                navigate("/login");
                return;
            }
            if (res.code !== 200) {
                message.error(res.message || "删除评论失败");
                return;
            }

            await loadComments(copybookId);
            await onCommentCreated?.();
            message.success("评论已删除");
        } catch (error) {
            console.error("删除评论失败", error);
            message.error("网络异常，请稍后重试");
        } finally {
            setDeletingCommentId(null);
        }
    };

    /**
     * 提交举报：
     *   · 未登录先去登录；
     *   · 举报人ID由后端 JWT 解析，前端只传 commentId + reason；
     *   · reporting 标记防止重复提交，成功后关闭弹窗。
     */
    const handleReport = async () => {
        if (!reportTarget || reporting) return;

        const reason = reportReason.trim();
        if (!reason) {
            message.warning("请输入举报原因");
            return;
        }

        setReporting(true);
        try {
            const res = await reportComment({
                commentId: reportTarget.id,
                reason,
            });
            if (res.code === 4001) {
                message.info("请先登录后再举报");
                navigate("/login");
                return;
            }
            if (res.code === 200) {
                message.success("举报已提交，我们会尽快核实");
                setReportTarget(null);
                setReportReason("");
            } else {
                message.error(res.message || "举报失败，请稍后重试");
            }
        } catch (error) {
            console.error("举报评论失败", error);
            message.error("网络异常，请稍后重试");
        } finally {
            setReporting(false);
        }
    };

    const renderComment = (comment: API.WebCopybookCommentResponse, isReply = false) => (
        <article
            key={comment.id}
            id={`copybook-comment-${comment.id}`}
            className={`scroll-mt-24 rounded-lg transition-colors duration-500 ${
                highlightedId === comment.id ? "bg-[#964328]/10 ring-1 ring-[#964328]/40" : ""
            } ${isReply ? "mt-4 pl-4 border-l-2 border-[#964328]/15" : "py-5 border-b border-amber-900/10"}`}
        >
            <div className="flex gap-3">
                <UserAvatar
                    src={comment.avatarUrl}
                    name={comment.username}
                    className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-[#70311e]">{comment.username}</span>
                        <time className="text-xs text-gray-400">{formatTime(comment.createTime)}</time>
                    </div>
                    <p className={`mt-2 whitespace-pre-wrap wrap-break-word leading-7 ${comment.deleted ? "text-gray-400" : "text-gray-700"}`}>
                        {!comment.deleted && comment.replyUsername && <span className="mr-1 text-[#964328]">回复 @{comment.replyUsername}</span>}
                        {comment.content}
                    </p>
                    {!comment.deleted && (
                        <>
                        <div className="mt-2 flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    if (inlineReplyId === comment.id) {
                                        setInlineReplyId(null);
                                    } else {
                                        setInlineReplyId(comment.id);
                                        setInlineReplyContent("");
                                    }
                                }}
                                className="min-h-11 px-1 text-sm text-gray-500 hover:text-[#964328] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#964328]"
                            >
                                回复
                            </button>
                            {/* 举报按钮：自己的评论不显示 */}
                            {currentUser?.id !== comment.userId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!localStorage.getItem("token")) {
                                            message.info("请先登录后再举报");
                                            navigate("/login");
                                            return;
                                        }
                                        setReportReason("");
                                        setReportTarget(comment);
                                    }}
                                    className="min-h-11 px-1 text-sm font-medium text-[#964328] hover:text-[#70311e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#964328]"
                                >
                                    举报
                                </button>
                            )}
                            {currentUser?.id === comment.userId && (
                                <Popconfirm
                                    title="删除这条评论？"
                                    description="删除后评论将无法恢复，确认删除吗？"
                                    okText="删除"
                                    cancelText="取消"
                                    okButtonProps={{ danger: true, loading: deletingCommentId === comment.id }}
                                    onConfirm={() => handleDelete(comment)}
                                >
                                    <button
                                        type="button"
                                        disabled={deletingCommentId !== null}
                                        className="min-h-11 px-1 text-sm text-gray-500 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                                    >
                                        删除
                                    </button>
                                </Popconfirm>
                            )}
                        </div>

                        {/* 内联回复输入框：点击回复时直接在该评论下方展开 */}
                        {inlineReplyId === comment.id && (
                            <div className="mt-3 rounded-xl border border-[#964328]/20 bg-[#fdfbf7]/80 p-3">
                                <div className="mb-2 text-xs text-[#70311e]">
                                    回复 @{comment.username}
                                </div>
                                <Input.TextArea
                                    autoFocus
                                    value={inlineReplyContent}
                                    onChange={event => setInlineReplyContent(event.target.value)}
                                    maxLength={500}
                                    autoSize={{ minRows: 2, maxRows: 6 }}
                                    placeholder={`回复 @${comment.username}`}
                                    disabled={inlineSubmitting}
                                    className="border-[#964328]/20! hover:border-[#964328]! focus:border-[#964328]!"
                                />
                                <div className="mt-2 flex items-center justify-between gap-2">
                                    <span className="text-xs text-gray-400">{inlineReplyContent.length}/500</span>
                                    <div className="flex items-center gap-2">
                                        <Button size="small" onClick={() => setInlineReplyId(null)} disabled={inlineSubmitting}>取消</Button>
                                        <Button size="small" type="primary" loading={inlineSubmitting} onClick={() => handleInlineReply(comment)} className="bg-[#964328]! hover:bg-[#70311e]! border-none">发布回复</Button>
                                    </div>
                                </div>
                            </div>
                        )}
                        </>
                    )}
                </div>
            </div>
            {!isReply && comment.replies?.map(reply => renderComment(reply, true))}
        </article>
    );

    return (
        <section id="copybook-comments" className="mt-14 scroll-mt-8">
            {/* 头部标题与展开/折叠控制 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <MessageOutlined className="text-xl text-[#964328]" aria-hidden="true" />
                    <h2 className="text-2xl font-bold font-serif text-gray-900">评论</h2>
                    <span className="text-sm text-gray-400">{total} 条</span>
                </div>
                
                {/* 折叠/展开控制按钮 */}
                <Button
                    type="text"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="flex items-center gap-1 text-[#964328] hover:text-[#70311e]! hover:bg-[#964328]/10!"
                >
                    {isCollapsed ? (
                        <>
                            <EditOutlined /> 写评论 <DownOutlined className="text-xs" />
                        </>
                    ) : (
                        <>
                            收起 <UpOutlined className="text-xs" />
                        </>
                    )}
                </Button>
            </div>

            {/* 可折叠的评论输入框（仅用于发表新评论；回复在评论下方内联展开） */}
            {!isCollapsed && (
                <div className="mt-5 rounded-xl border border-[#964328]/20 bg-[#fdfbf7]/80 p-4 shadow-sm transition-all">
                    <Input.TextArea
                        value={content}
                        onChange={event => setContent(event.target.value)}
                        maxLength={500}
                        autoSize={{ minRows: 3, maxRows: 8 }}
                        placeholder="写下你的看法，和墨友交流…"
                        aria-label="评论内容"
                        disabled={submitting}
                        className="border-[#964328]/20! hover:border-[#964328]! focus:border-[#964328]! focus:shadow-[0_0_0_2px_rgba(150,67,40,0.1)]!"
                    />
                    <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-xs text-gray-400">{content.length}/500</span>
                        <Button 
                            type="primary" 
                            icon={<SendOutlined />} 
                            loading={submitting} 
                            onClick={handleSubmit}
                            className="bg-[#964328]! hover:bg-[#70311e]! border-none shadow-sm"
                        >
                            发布评论
                        </Button>
                    </div>
                </div>
            )}

            <div className="mt-4">
                {loading ? (
                    <div className="flex justify-center py-10" aria-label="评论加载中"><Spin /></div>
                ) : comments.length === 0 ? (
                    <Empty description="还没有评论，来写下第一条吧" className="py-8" />
                ) : (
                    comments.map(comment => renderComment(comment))
                )}
            </div>

            {/* 我要举报 */}
            <Modal
                title="我要举报"
                open={!!reportTarget}
                width={520}
                okText="提交"
                cancelText="取消"
                confirmLoading={reporting}
                maskClosable={!reporting}
                okButtonProps={{
                    className: "bg-[#964328]! hover:bg-[#70311e]! border-none",
                }}
                styles={{ body: { paddingBottom: 8 } }}
                onCancel={() => {
                    if (reporting) return;
                    setReportTarget(null);
                    setReportReason("");
                }}
                onOk={handleReport}
            >
                {reportTarget && (
                    <p className="mb-3 text-xs text-gray-500">
                        举报评论：
                        <span className="font-medium text-gray-700">
                            {reportTarget.username}
                        </span>
                        「
                        {reportTarget.content.length > 40
                            ? `${reportTarget.content.slice(0, 40)}…`
                            : reportTarget.content}
                        」
                    </p>
                )}
                <div className="mb-6">
                    <Input.TextArea
                        value={reportReason}
                        onChange={(event) => setReportReason(event.target.value)}
                        maxLength={500}
                        showCount
                        autoSize={{ minRows: 3, maxRows: 6 }}
                        placeholder="请输入举报原因"
                        disabled={reporting}
                    />
                </div>
            </Modal>
        </section>
    );
};

export default CommentSection;
