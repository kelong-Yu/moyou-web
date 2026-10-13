import request from "../request";

/**
 * 系统通知分页（已发布公告 + 当前用户已读状态）
 *
 * GET /api/web/message/announcements（需要登录）
 */
export async function getMyAnnouncementMessages(params: {
  current: number;
  pageSize: number;
}) {
  return request<API.Result<API.PageResult<API.MessageAnnouncementItem>>>(
    "/api/web/message/announcements",
    {
      method: "GET",
      params,
    }
  );
}

/**
 * 评论互动分页（其他用户回复当前用户的评论，按回复时间倒序）
 *
 * GET /api/web/message/comment-interactions（需要登录）
 */
export async function getMyCommentInteractions(params: {
  current: number;
  pageSize: number;
}) {
  return request<API.Result<API.PageResult<API.MessageCommentItem>>>(
    "/api/web/message/comment-interactions",
    {
      method: "GET",
      params,
    }
  );
}

/**
 * 我的评论分页（当前用户发表的全部评论，含自己回复自己；仅查看无已读态）
 *
 * GET /api/web/message/my-comments（需要登录，按时间倒序）
 */
export async function getMyComments(params: {
  current: number;
  pageSize: number;
}) {
  return request<API.Result<API.PageResult<API.MessageMyCommentItem>>>(
    "/api/web/message/my-comments",
    {
      method: "GET",
      params,
    }
  );
}

/**
 * 两类消息的未读数量（Tab 角标用）
 *
 * GET /api/web/message/unread-counts（需要登录）
 */
export async function getMessageUnreadCounts() {
  return request<API.Result<API.MessageUnreadCounts>>(
    "/api/web/message/unread-counts",
    {
      method: "GET",
    }
  );
}

/**
 * 标记单条消息已读（幂等）
 *
 * POST /api/web/message/read（需要登录）
 */
export async function markMessageRead(
  messageType: API.MessageType,
  messageId: number
) {
  return request<API.Result<null>>(
    "/api/web/message/read",
    {
      method: "POST",
      data: { messageType, messageId },
    }
  );
}

/**
 * 全部已读（系统通知 + 评论互动）
 *
 * POST /api/web/message/read-all（需要登录）
 * 返回本次新标记的条数，0 表示没有未读消息。
 */
export async function markAllMessagesRead() {
  return request<API.Result<number>>(
    "/api/web/message/read-all",
    {
      method: "POST",
    }
  );
}
