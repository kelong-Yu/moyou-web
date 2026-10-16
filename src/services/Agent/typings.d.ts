declare namespace API {

    /**
     * AI 聊天请求参数
     */
    type AiChatRequest = {
        /**
         * 会话 ID
         * 第一次聊天传 null
         */
        conversationId: number | null;

        /**
         * 用户消息
         */
        message: string;
    };

    /**
     * AI 聊天响应
     */
    type AiChatResponse = {
        /**
         * 会话 ID
         */
        conversationId: number;

        /**
         * AI 消息 ID
         */
        messageId: number;

        /**
         * AI 回复内容
         */
        content: string;
    };

    /**
     * AI 历史会话
     */
    type AiConversationResponse = {
        /**
         * 会话 ID
         */
        id: number;

        /**
         * 会话标题
         */
        title: string;

        /**
         * 是否置顶：1-置顶 0-普通
         */
        isTop: number;

        /**
         * 最后更新时间
         */
        updateTime: string;
    };

    /**
     * AI 历史消息
     */
    type AiMessageResponse = {
        /**
         * 消息 ID
         */
        id: number;

        /**
         * 会话 ID
         */
        conversationId: number;

        /**
         * 消息角色
         * user / assistant
         */
        role: "user" | "assistant";

        /**
         * 消息内容
         */
        content: string;

        /**
         * 消息序号
         */
        sequenceNo: number;
    };

}