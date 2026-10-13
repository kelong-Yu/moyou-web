import request from "../request";

/**
 * 上报一次页面浏览
 *
 * POST /api/web/history/report（需要登录，用户ID由后端 JWT 解析）
 */
export async function reportVisit(data: API.VisitReportRequest) {
  return request<API.Result<null>>(
    "/api/web/history/report",
    {
      method: "POST",
      data,
    }
  );
}

/**
 * 当前用户浏览历史分页列表
 *
 * GET /api/web/history/list（需要登录，按浏览时间倒序，仅返回60天内记录）
 */
export async function getMyVisitHistoryPage(
  params: API.VisitHistoryPageParams
) {
  return request<API.Result<API.PageResult<API.VisitHistoryItem>>>(
    "/api/web/history/list",
    {
      method: "GET",
      params,
    }
  );
}

/**
 * 清空当前用户全部浏览历史
 *
 * DELETE /api/web/history/clear（需要登录）
 */
export async function clearMyVisitHistory() {
  return request<API.Result<null>>(
    "/api/web/history/clear",
    {
      method: "DELETE",
    }
  );
}
