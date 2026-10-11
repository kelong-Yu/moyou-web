import { App, Avatar, Button, Empty, Input, Popconfirm, Spin } from "antd";
import { MessageOutlined, SendOutlined, DownOutlined, UpOutlined, EditOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../stores";
import { createCopybookComment, deleteCopybookComment, getCopybookComments } from "../../services/comment/api";

interface CommentSectionProps {
    copybookId?: number;
    onCommentCreated?: () => void | Promise<void>;
}

const formatTime = (value?: string) => {
    if (!value) return "刚刚";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value.replace("T", " ").slice(0, 16)
        : date.toLocaleString("zh-CN", { hour12: false, month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const CommentSection: React.FC<CommentSectionProps> = ({ copybookId, onCommentCreated }) => {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const currentUser = useSelector((state: RootState) => state.user.userInfo);
    const [comments, setComments] = useState<API.WebCopybookCommentResponse[]>([]);
    const [total, setTotal] = useState(0);
    const [content, setContent] = useState("");
    const [replyTarget, setReplyTarget] = useState<API.WebCopybookCommentResponse | null>(null);
    const [loadedCopybookId, setLoadedCopybookId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
    
    // 新增：默认折叠评论输入框
    const [isCollapsed, setIsCollapsed] = useState(true);

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
                parentId: replyTarget?.id,
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
            setReplyTarget(null);
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

    const renderComment = (comment: API.WebCopybookCommentResponse, isReply = false) => (
        <article key={comment.id} className={isReply ? "mt-4 pl-4 border-l-2 border-[#964328]/15" : "py-5 border-b border-amber-900/10"}>
            <div className="flex gap-3">
                <Avatar src={comment.avatarUrl} className="shrink-0 bg-[#964328]">
                    {comment.username?.slice(0, 1)}
                </Avatar>
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
                        <div className="mt-2 flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setReplyTarget(comment);
                                    setIsCollapsed(false);
                                }}
                                className="min-h-11 px-1 text-sm text-gray-500 hover:text-[#964328] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#964328]"
                            >
                                回复
                            </button>
                            {currentUser?.id === comment.userId && (
                                <Popconfirm
                                    title="删除这条评论？"
                                    description="删除后无法恢复，但其回复会保留。"
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

            {/* 可折叠的评论输入框 */}
            {!isCollapsed && (
                <div className="mt-5 rounded-xl border border-[#964328]/20 bg-[#fdfbf7]/80 p-4 shadow-sm transition-all">
                    {replyTarget && (
                        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-[#964328]/10 px-3 py-2 text-sm text-[#70311e]">
                            <span>回复 @{replyTarget.username}</span>
                            <button type="button" onClick={() => setReplyTarget(null)} className="min-h-8 px-1 text-gray-500 hover:text-[#964328]">取消</button>
                        </div>
                    )}
                    <Input.TextArea
                        value={content}
                        onChange={event => setContent(event.target.value)}
                        maxLength={500}
                        autoSize={{ minRows: 3, maxRows: 8 }}
                        placeholder={replyTarget ? `回复 @${replyTarget.username}` : "写下你的看法，和墨友交流…"}
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
        </section>
    );
};

export default CommentSection;
