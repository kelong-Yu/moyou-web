import { useEffect, useState } from "react";
import {
    Button,
    Card,
    Input,
    List,
    Space,
    Spin,
    Typography,
    App
} from "antd";
import {
    PlusOutlined,
    SendOutlined,
} from "@ant-design/icons";

import {
    aiChat,
    getConversationList,
    getMessageList,
} from "../../services/Agent/api";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../stores";
import { usePageMeta } from "../../hooks/usePageMeta";

const { TextArea } = Input;
const { Title, Text } = Typography;

/**
 * 页面中的聊天消息
 */
interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

const XiaoMoAgent = () => {

    const {message} = App.useApp();
    const navigate = useNavigate();

    // 页面标题 + 浏览历史
    usePageMeta({ title: "小墨Agent", pageType: "agent" });

    // 从 Redux 获取当前登录用户
    const userInfo = useSelector(
        (state: RootState) => state.user.userInfo
    );
    /**
     * 当前会话 ID
     *
     * null 表示新会话，还没有真正创建数据库会话
     */
    const [conversationId, setConversationId] = useState<number | null>(null);

    /**
     * 历史会话列表
     */
    const [conversationList, setConversationList] = useState<
        API.AiConversationResponse[]
    >([]);

    /**
     * 当前聊天消息
     */
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: "assistant",
            content: "你好，我是小墨，可以陪你一起学习书法。",
        },
    ]);

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
     * 页面进入时检查登录状态
     */
    useEffect(() => {

        if (!userInfo) {
            message.warning("请先登录后再使用小墨 AI");

            navigate("/login", {
                replace: true,
            });
        }

    }, [userInfo, navigate, message]);

    /**
     * 登录后查询历史会话
     */
    useEffect(() => {

        // 没有登录，不查询历史会话
        if (!userInfo) {
            return;
        }

        loadConversationList();

    }, [userInfo]);

    /**
     * 查询历史会话
     */
    const loadConversationList = async () => {
        setConversationLoading(true);

        try {
            const res = await getConversationList();

            setConversationList(res.data);
        } catch (error) {
            console.error("查询历史会话失败：", error);
        } finally {
            setConversationLoading(false);
        }
    };

    /**
     * 点击历史会话
     */
    const handleSelectConversation = async (
        id: number
    ) => {

        // AI 正在回复时，不切换会话
        if (loading) {
            return;
        }

        setConversationId(id);
        setMessageLoading(true);

        try {
            const res = await getMessageList(id);

            const historyMessages: ChatMessage[] = res.data.map(
                item => ({
                    role: item.role,
                    content: item.content,
                })
            );

            setMessages(historyMessages);
        } catch (error) {
            console.error("查询历史消息失败：", error);
        } finally {
            setMessageLoading(false);
        }
    };

    /**
     * 创建新对话
     *
     * 此时只重置前端状态，
     * 真正的数据库会话会在第一次发送消息时创建。
     */
    const handleNewConversation = () => {

        if (loading) {
            return;
        }

        setConversationId(null);

        setMessages([
            {
                role: "assistant",
                content: "你好，我是小墨，可以陪你一起学习书法。",
            },
        ]);

        setInputValue("");
    };

    /**
     * 发送消息
     */
    const handleSend = async () => {

        const message = inputValue.trim();

        // 空消息不发送
        if (!message || loading) {
            return;
        }

        // 先显示用户消息
        setMessages(prev => [
            ...prev,
            {
                role: "user",
                content: message,
            },
        ]);

        // 清空输入框
        setInputValue("");

        setLoading(true);

        try {

            const res = await aiChat({
                conversationId,
                message,
            });

            // 第一次聊天时，保存后端创建的会话 ID
            setConversationId(res.data.conversationId);

            // 显示 AI 回复
            setMessages(prev => [
                ...prev,
                {
                    role: "assistant",
                    content: res.data.content,
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

     // 防止未登录时先渲染 AI 页面
    if (!userInfo) {
        return null;
    }

    return (
        <div
            style={{
                width: "100%",
                height: "100vh",
                padding: 24,
                boxSizing: "border-box",
                background: "#f5f5f5",
            }}
        >

            <Card
                style={{
                    width: "100%",
                    height: "100%",
                }}
                styles={{
                    body: {
                        height: "100%",
                        padding: 0,
                    },
                }}
            >

                <div
                    style={{
                        height: "100%",
                        display: "flex",
                    }}
                >

                    {/* ==================== 左侧历史会话 ==================== */}
                    <div
                        style={{
                            width: 260,
                            borderRight: "1px solid #f0f0f0",
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >

                        {/* 标题 */}
                        <div
                            style={{
                                padding: "20px 16px 12px",
                            }}
                        >
                            <Title
                                level={4}
                                style={{
                                    margin: 0,
                                }}
                            >
                                小墨 AI
                            </Title>

                            <Text type="secondary">
                                书法学习助手
                            </Text>
                        </div>

                        {/* 新建对话 */}
                        <div
                            style={{
                                padding: "8px 16px 16px",
                            }}
                        >
                            <Button
                                block
                                icon={<PlusOutlined />}
                                onClick={handleNewConversation}
                                disabled={loading}
                            >
                                新建对话
                            </Button>
                        </div>

                        {/* 历史会话 */}
                        <div
                            style={{
                                flex: 1,
                                overflowY: "auto",
                                padding: "0 8px 16px",
                            }}
                        >

                            {conversationLoading ? (
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "center",
                                        paddingTop: 30,
                                    }}
                                >
                                    <Spin />
                                </div>
                            ) : (
                                <List
                                    dataSource={conversationList}
                                    locale={{
                                        emptyText: "暂无历史会话",
                                    }}
                                    renderItem={item => (
                                        <List.Item
                                            onClick={() =>
                                                handleSelectConversation(
                                                    item.id
                                                )
                                            }
                                            style={{
                                                cursor: loading
                                                    ? "not-allowed"
                                                    : "pointer",
                                                padding: "10px 12px",
                                                marginBottom: 4,
                                                borderRadius: 8,
                                                background:
                                                    conversationId ===
                                                    item.id
                                                        ? "#f0f5ff"
                                                        : "transparent",
                                                opacity: loading
                                                    ? 0.6
                                                    : 1,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: "100%",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        overflow: "hidden",
                                                        whiteSpace: "nowrap",
                                                        textOverflow:
                                                            "ellipsis",
                                                    }}
                                                >
                                                    {item.title}
                                                </div>

                                                <div
                                                    style={{
                                                        marginTop: 4,
                                                        fontSize: 12,
                                                        color: "#999",
                                                    }}
                                                >
                                                    {item.updateTime}
                                                </div>
                                            </div>
                                        </List.Item>
                                    )}
                                />
                            )}

                        </div>

                    </div>

                    {/* ==================== 右侧聊天区域 ==================== */}
                    <div
                        style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            minWidth: 0,
                        }}
                    >

                        {/* 当前会话标题 */}
                        <div
                            style={{
                                padding: "18px 24px",
                                borderBottom: "1px solid #f0f0f0",
                            }}
                        >
                            <Text strong>
                                {conversationId
                                    ? conversationList.find(
                                          item =>
                                              item.id ===
                                              conversationId
                                      )?.title || "当前对话"
                                    : "新对话"}
                            </Text>
                        </div>

                        {/* 消息区域 */}
                        <div
                            style={{
                                flex: 1,
                                overflowY: "auto",
                                padding: 24,
                            }}
                        >

                            {messageLoading ? (
                                <div
                                    style={{
                                        height: "100%",
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                    }}
                                >
                                    <Spin />
                                </div>
                            ) : (
                                messages.map((item, index) => {

                                    const isUser =
                                        item.role === "user";

                                    return (
                                        <div
                                            key={index}
                                            style={{
                                                display: "flex",
                                                justifyContent: isUser
                                                    ? "flex-end"
                                                    : "flex-start",
                                                marginBottom: 20,
                                            }}
                                        >

                                            <div
                                                style={{
                                                    maxWidth: "70%",
                                                    padding:
                                                        "12px 16px",
                                                    borderRadius: 10,
                                                    background: isUser
                                                        ? "#1677ff"
                                                        : "#f0f0f0",
                                                    color: isUser
                                                        ? "#fff"
                                                        : "#333",
                                                    whiteSpace: "pre-wrap",
                                                    wordBreak:
                                                        "break-word",
                                                }}
                                            >
                                                {item.content}
                                            </div>

                                        </div>
                                    );
                                })
                            )}

                            {/* AI 回复中的状态 */}
                            {loading && (
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "flex-start",
                                        marginBottom: 20,
                                    }}
                                >
                                    <div
                                        style={{
                                            padding: "12px 16px",
                                            borderRadius: 10,
                                            background: "#f0f0f0",
                                            color: "#999",
                                        }}
                                    >
                                        小墨正在思考...
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* 输入区域 */}
                        <div
                            style={{
                                padding: 16,
                                borderTop: "1px solid #f0f0f0",
                            }}
                        >

                            <Space.Compact
                                style={{
                                    width: "100%",
                                }}
                            >

                                <TextArea
                                    value={inputValue}
                                    onChange={event =>
                                        setInputValue(
                                            event.target.value
                                        )
                                    }
                                    onKeyDown={handlePressEnter}
                                    placeholder="输入你想问的小墨的问题..."
                                    autoSize={{
                                        minRows: 1,
                                        maxRows: 5,
                                    }}
                                    disabled={loading}
                                />

                                <Button
                                    type="primary"
                                    icon={<SendOutlined />}
                                    loading={loading}
                                    onClick={handleSend}
                                >
                                    发送
                                </Button>

                            </Space.Compact>

                            <div
                                style={{
                                    marginTop: 8,
                                    fontSize: 12,
                                    color: "#999",
                                }}
                            >
                                Enter 发送，Shift + Enter 换行
                            </div>

                        </div>

                    </div>

                </div>

            </Card>

        </div>
    );
};

export default XiaoMoAgent;

