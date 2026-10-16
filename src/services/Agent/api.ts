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
 *
 * @param keyword 标题搜索关键词，传空返回全部
 */
export async function getConversationList(keyword?: string) {
    return request<API.Result<API.AiConversationResponse[]>>(
        "/api/web/ai/conversation/list",
        {
            method: "GET",
            params: keyword ? { keyword } : undefined,
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

/**
 * 重命名会话标题
 *
 * PUT /api/web/ai/conversation/{conversationId}/title
 */
export async function renameConversation(
    conversationId: number,
    title: string,
) {
    return request<API.Result<null>>(
        `/api/web/ai/conversation/${conversationId}/title`,
        {
            method: "PUT",
            data: { title },
        }
    );
}

/**
 * 置顶 / 取消置顶会话
 *
 * POST /api/web/ai/conversation/{conversationId}/top?top=true
 */
export async function topConversation(
    conversationId: number,
    top: boolean,
) {
    return request<API.Result<null>>(
        `/api/web/ai/conversation/${conversationId}/top`,
        {
            method: "POST",
            params: { top },
        }
    );
}

/**
 * 彻底删除会话
 *
 * DELETE /api/web/ai/conversation/{conversationId}
 *
 * 会话、全部消息与 Redis 对话记忆一并删除，不可恢复。
 */
export async function deleteConversation(
    conversationId: number,
) {
    return request<API.Result<null>>(
        `/api/web/ai/conversation/${conversationId}`,
        {
            method: "DELETE",
        }
    );
}
