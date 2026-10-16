import { useEffect, useRef, useState } from "react";
import { App, Input, Spin, Tooltip } from "antd";
import {
    ArrowUpOutlined,
    LoadingOutlined,
    MenuOutlined,
    PaperClipOutlined,
    RobotOutlined,
    ThunderboltOutlined,
} from "@ant-design/icons";

import {
    aiChat,
    deleteConversation,
    getConversationList,
    getMessageList,
    renameConversation,
    topConversation,
} from "../../services/Agent/api";
import { useSelector } from "react-redux";
import type { RootState } from "../../stores";
import { usePageMeta } from "../../hooks/usePageMeta";
import HistoryDrawer from "./components/HistoryDrawer";
import "./index.css";

const { TextArea } = Input;

/** 输入框字数上限 */
const MAX_INPUT_LENGTH = 5000;

/** 页面中的聊天消息 */
interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

/** 书写报告集（试用阶段示例数据） */
const REPORTS = [
    { name: "楷书结构专项", desc: "横画平正度 82%，撇画起笔偏重，收笔略急" },
    { name: "兰亭序临帖周报", desc: "通篇 324 字，行气连贯度较上周提升 15%" },
    { name: "执笔与腕力评估", desc: "悬腕稳定性偏弱，建议每日 10 分钟腕力练习" },
    { name: "永字八法复盘", desc: "趯笔出锋不足，钩画长度普遍偏短三分之一" },
    { name: "欧体九成宫月报", desc: "中宫收紧到位，竖画劲挺但收笔略散" },
    { name: "行书章法分析", desc: "字距过密，行间留白不足，气息略显拥堵" },
    { name: "米芾笔意对比", desc: "八面出锋还原度 61%，转锋方向仍需校准" },
    { name: "中锋用笔训练", desc: "提按转换节奏趋于稳定，线条厚度提升明显" },
    { name: "篆书笔法初探", desc: "中锋行笔达标率 76%，起收笔藏锋待加强" },
    { name: "硬笔书写姿势", desc: "握笔角度偏低，纸面倾斜过大影响出锋" },
];

/**
 * 后端业务错误以 HTTP 200 + code != 200 返回，
 * 统一转成异常交给调用方兜底提示。
 */
function assertOk(res: API.Result<unknown>, fallback: string) {
    if (res.code !== 200) {
        throw new Error(res.message || fallback);
    }
}

const XiaoMoAgent = () => {

    // 页面标题 + 浏览历史
    usePageMeta({ title: "小墨Agent", pageType: "agent" });

    const { message } = App.useApp();

    // 从 Redux 获取当前登录用户
    const userInfo = useSelector(
        (state: RootState) => state.user.userInfo
    );

    /**
     * 当前会话 ID
     *
     * null 表示新任务，还没有真正创建数据库会话
     */
    const [conversationId, setConversationId] = useState<number | null>(null);

    /**
     * 历史会话列表
     */
    const [conversationList, setConversationList] = useState<
        API.AiConversationResponse[]
    >([]);

    /**
     * 历史列表标题搜索关键词
     */
    const [keyword, setKeyword] = useState("");

    /**
     * 当前聊天消息
     */
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    /**
     * 输入框
     */
    const [inputValue, setInputValue] = useState("");

    /**
     * AI 回复状态
     */
    const [loading, setLoading] = useState(false);

    /**
     * 历史会话加载状态
     */
    const [conversationLoading, setConversationLoading] = useState(false);

    /**
     * 当前历史消息加载状态
     */
    const [messageLoading, setMessageLoading] = useState(false);

    /**
     * 历史列表抽屉
     */
    const [drawerOpen, setDrawerOpen] = useState(false);

    const messageBoxRef = useRef<HTMLDivElement>(null);

    /** 没有消息时展示落地页 */
    const isLanding = messages.length === 0 && !messageLoading;

    /**
     * 登录后查询历史会话 / 标题搜索
     *
     * 关键词变化后防抖重新查询，首次挂载同样走这里完成初始加载。
     * 登录校验已由路由级 RequireLogin 守卫完成，此处仅保留空值防御。
     */
    useEffect(() => {

        if (!userInfo) {
            return;
        }

        const timer = window.setTimeout(() => {
            loadConversationList(keyword);
        }, 350);

        return () => window.clearTimeout(timer);

    }, [keyword, userInfo]);

    /**
     * 消息变化后滚动到底部
     */
    useEffect(() => {
        const box = messageBoxRef.current;
        if (box) {
            box.scrollTop = box.scrollHeight;
        }
    }, [messages, loading, messageLoading]);

    /**
     * 查询历史会话
     *
     * 用函数声明（提升）供上方 effect 调用，
     * 避免 const 声明前的引用告警。
     */
    async function loadConversationList(searchKeyword = keyword) {
        setConversationLoading(true);

        try {
            const res = await getConversationList(
                searchKeyword.trim() || undefined
            );

            assertOk(res, "历史会话加载失败");

            setConversationList(res.data ?? []);
        } catch (error) {
            console.error("查询历史会话失败：", error);
        } finally {
            setConversationLoading(false);
        }
    }

    /**
     * 点击历史会话
     */
    const handleSelectConversation = async (id: number) => {

        // AI 正在回复时，不切换会话
        if (loading) {
            return;
        }

        setDrawerOpen(false);
        setConversationId(id);
        setMessageLoading(true);

        try {
            const res = await getMessageList(id);

            assertOk(res, "历史消息加载失败");

            const historyMessages: ChatMessage[] = (res.data ?? []).map(
                item => ({
                    role: item.role,
                    content: item.content,
                })
            );

            setMessages(historyMessages);
        } catch (error) {
            console.error("查询历史消息失败：", error);
            message.error(readErrorMessage(error, "历史消息加载失败"));
        } finally {
            setMessageLoading(false);
        }
    };

    /**
     * 新建任务
     *
     * 此时只重置前端状态，
     * 真正的数据库会话会在第一次发送消息时创建。
     */
    const handleNewTask = () => {

        if (loading) {
            return;
        }

        setDrawerOpen(false);
        setConversationId(null);
        setMessages([]);
        setInputValue("");
    };

    /**
     * 重命名会话
     */
    const handleRename = async (id: number, title: string) => {
        try {
            const res = await renameConversation(id, title);
            assertOk(res, "重命名失败");
            message.success("已重命名");
            await loadConversationList();
        } catch (error) {
            console.error("重命名失败：", error);
            message.error(readErrorMessage(error, "重命名失败"));
            throw error;
        }
    };

    /**
     * 置顶 / 取消置顶
     */
    const handleToggleTop = async (item: API.AiConversationResponse) => {
        try {
            const res = await topConversation(item.id, item.isTop !== 1);
            assertOk(res, "置顶设置失败");
            await loadConversationList();
        } catch (error) {
            console.error("置顶设置失败：", error);
            message.error(readErrorMessage(error, "置顶设置失败"));
        }
    };

    /**
     * 删除会话
     */
    const handleDelete = async (item: API.AiConversationResponse) => {
        try {
            const res = await deleteConversation(item.id);
            assertOk(res, "删除失败");

            // 删除的是当前会话：回到落地页
            if (item.id === conversationId) {
                setConversationId(null);
                setMessages([]);
                setInputValue("");
            }

            await loadConversationList();
        } catch (error) {
            console.error("删除会话失败：", error);
            message.error(readErrorMessage(error, "删除失败"));
        }
    };

    /**
     * 发送消息
     */
    const handleSend = async () => {

        const question = inputValue.trim();

        // 空消息不发送
        if (!question || loading) {
            return;
        }

        // 先显示用户消息
        setMessages(prev => [
            ...prev,
            {
                role: "user",
                content: question,
            },
        ]);

        // 清空输入框
        setInputValue("");

        setLoading(true);

        try {

            const res = await aiChat({
                conversationId,
                message: question,
            });

            assertOk(res, "小墨暂时无法回复");

            // 第一次聊天时，保存后端创建的会话 ID
            setConversationId(res.data!.conversationId);

            // 显示 AI 回复
            setMessages(prev => [
                ...prev,
                {
                    role: "assistant",
                    content: res.data!.content,
                },
            ]);

            // 重新加载历史会话
            //
            // 第一次聊天后会出现新的会话；
            // 后续聊天后 updateTime 也会更新。
            await loadConversationList();

        } catch (error) {

            console.error("AI 聊天失败：", error);

            setMessages(prev => [
                ...prev,
                {
                    role: "assistant",
                    content: "抱歉，小墨暂时无法回复，请稍后再试。",
                },
            ]);

        } finally {
            setLoading(false);
        }
    };

    /**
     * Enter 发送
     *
     * Shift + Enter 换行
     */
    const handlePressEnter = (
        event: React.KeyboardEvent<HTMLTextAreaElement>
    ) => {

        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    };

    const activeTitle = conversationId
        ? conversationList.find(item => item.id === conversationId)?.title
        : undefined;

    // ==================== 输入卡片（落地页与聊天态共用） ====================
    const composer = (
        <div
            className={`agent-composer${
                isLanding ? "" : " agent-composer--chat"
            }`}
        >
            <TextArea
                className="agent-composer-input"
                value={inputValue}
                onChange={event => setInputValue(event.target.value)}
                onKeyDown={handlePressEnter}
                placeholder="读帖、临帖、纠正笔法，小墨帮你规划练习"
                maxLength={MAX_INPUT_LENGTH}
                variant="borderless"
                autoSize={{
                    minRows: isLanding ? 2 : 1,
                    maxRows: 6,
                }}
                disabled={loading}
            />

            <div className="agent-composer-bar">
                <div className="agent-composer-tools">
                    <Tooltip title="智能体模式开发中">
                        <button
                            type="button"
                            className="agent-tool-chip"
                            onClick={() => message.info("该功能正在开发中")}
                        >
                            <RobotOutlined />
                            Agent模式
                        </button>
                    </Tooltip>

                    <Tooltip title="附件上传开发中">
                        <button
                            type="button"
                            className="agent-tool-btn"
                            onClick={() => message.info("该功能正在开发中")}
                        >
                            <PaperClipOutlined />
                            文件
                        </button>
                    </Tooltip>

                    <Tooltip title="技能库开发中">
                        <button
                            type="button"
                            className="agent-tool-btn"
                            onClick={() => message.info("该功能正在开发中")}
                        >
                            <ThunderboltOutlined />
                            技能
                        </button>
                    </Tooltip>
                </div>

                <div className="agent-composer-right">
                    <span className="agent-composer-count">
                        {inputValue.length}/{MAX_INPUT_LENGTH}
                    </span>
                    <button
                        type="button"
                        className="agent-send-btn"
                        onClick={handleSend}
                        disabled={!inputValue.trim() || loading}
                        aria-label="发送"
                    >
                        {loading ? <LoadingOutlined /> : <ArrowUpOutlined />}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div
            className={`agent-page${isLanding ? "" : " agent-page--chat"}`}
        >

            {/* ==================== 顶部：历史列表入口 ==================== */}
            <div className="agent-topbar">
                <button
                    type="button"
                    className="agent-history-btn"
                    onClick={() => setDrawerOpen(true)}
                >
                    <MenuOutlined />
                    历史列表
                </button>
            </div>

            <div className="agent-main">

                {isLanding ? (
                    <>
                        {/* ==================== 标题区 ==================== */}
                        <div className="agent-hero">
                            <h1 className="agent-hero-title">小墨助手</h1>
                            <p className="agent-hero-subtitle">
                                产品处于试用阶段，欢迎体验和反馈，共建服务书法学习的AI应用
                            </p>
                        </div>

                        {composer}

                        {/* ==================== 书写报告集 ==================== */}
                        <div className="agent-reports">
                            <h2 className="agent-reports-title">
                                书写报告集
                            </h2>

                            <div className="agent-reports-grid">
                                {REPORTS.map(item => (
                                    <div
                                        key={item.name}
                                        className="agent-report-card"
                                    >
                                        <div className="agent-report-name">
                                            {item.name}
                                        </div>
                                        <div className="agent-report-desc">
                                            {item.desc}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* ==================== 会话标题 ==================== */}
                        {activeTitle && (
                            <div className="agent-chat-title">
                                {activeTitle}
                            </div>
                        )}

                        {/* ==================== 消息区 ==================== */}
                        <div
                            className="agent-messages"
                            ref={messageBoxRef}
                        >
                            {messageLoading ? (
                                <div className="agent-loading">
                                    <Spin />
                                </div>
                            ) : (
                                messages.map((item, index) => {

                                    const isUser =
                                        item.role === "user";

                                    return (
                                        <div
                                            key={index}
                                            className={`agent-msg${
                                                isUser
                                                    ? " agent-msg--user"
                                                    : ""
                                            }`}
                                        >
                                            <div
                                                className={`agent-msg-bubble agent-msg-bubble--${
                                                    isUser ? "user" : "assistant"
                                                }`}
                                            >
                                                {item.content}
                                            </div>
                                        </div>
                                    );
                                })
                            )}

                            {/* AI 回复中的状态 */}
                            {loading && (
                                <div className="agent-msg">
                                    <div className="agent-msg-bubble agent-msg-bubble--assistant agent-msg-pending">
                                        小墨正在思考...
                                    </div>
                                </div>
                            )}
                        </div>

                        {composer}
                    </>
                )}

            </div>

            {/* ==================== 底部 AI 声明 ==================== */}
            <div className="agent-disclaimer">
                服务生成的所有内容均由人工智能模型生成，其生成内容的准确性和完整性无法保证，不能代表我们的态度和观点。
            </div>

            {/* ==================== 历史列表抽屉 ==================== */}
            <HistoryDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                items={conversationList}
                loading={conversationLoading}
                activeId={conversationId}
                keyword={keyword}
                onKeywordChange={setKeyword}
                onSelect={handleSelectConversation}
                onNewTask={handleNewTask}
                onRename={handleRename}
                onToggleTop={handleToggleTop}
                onDelete={handleDelete}
                busy={loading}
            />

        </div>
    );
};

/** 优先展示后端返回的业务提示 */
function readErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return fallback;
}

export default XiaoMoAgent;
