declare namespace API {

  /**
   * 提交用户反馈
   *
   * 字段由前端先行定义，后端 /api/web/feedback 契约确认时若有出入，
   * 以本文件与 api.ts 为唯一改动点。
   */
  type FeedbackSubmitRequest = {
    /** 问题或建议正文，必填 */
    content: string;

    /** 联系邮箱，选填 */
    contactEmail?: string;
  };
}
