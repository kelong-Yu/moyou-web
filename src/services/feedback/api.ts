import request from "../request";

/**
 * 提交用户反馈
 *
 * POST /api/web/feedback
 *
 * ⚠ 后端接口尚未实现（任务3 契约待定），现在提交会返回 404，
 * 弹窗会如实提示「提交失败」而不是假装成功。
 *
 * 截图不随本接口传输：墨友的图片上传走既有的对象存储通道，
 * 需要单独约定上传接口后再把地址一并带上。
 */
export async function submitFeedback(data: API.FeedbackSubmitRequest) {
  return request<API.Result<boolean>>("/api/web/feedback", {
    method: "POST",
    data,
  });
}
