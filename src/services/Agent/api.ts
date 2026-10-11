import request from "../request";

/**
 * AI 聊天接口
 *
 * POST /api/web/ai/chat
 */
export async function aiChat(
    data: API.AiChatRequest,
) {
    return request<API.Result<API.AiChatResponse>>(
        "/api/web/ai/chat",
        {
            method: "POST",
            data,
            timeout: 60000,
        }
    );

}

/**
 * 查询当前用户的历史会话
 *
 * GET /api/web/ai/conversation/list
 */
export async function getConversationList() {
    return request<API.Result<API.AiConversationResponse[]>>(
        "/api/web/ai/conversation/list",
        {
            method: "GET",
        }
    );
}

/**
 * 查询指定会话的历史消息
 *
 * GET /api/web/ai/conversation/{conversationId}/messages
 */
export async function getMessageList(
    conversationId: number,
) {
    return request<API.Result<API.AiMessageResponse[]>>(
        `/api/web/ai/conversation/${conversationId}/messages`,
        {
            method: "GET",
        }
    );
}