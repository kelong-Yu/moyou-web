declare namespace API {

  /**
   * 浏览历史上报请求
   *
   * userId 由后端根据 JWT 解析，前端不传。
   */
  type VisitReportRequest = {

    /** 页面业务类型：home/copybook/calligrapher/user/practise/search/agent 等 */
    pageType: string;

    /** 页面路径（浏览器 pathname，如 /copybook/12） */
    pagePath: string;

    /** 页面名称（简洁真实标题，不含「 - 墨友」后缀） */
    pageTitle: string;

    /** 业务对象ID（碑帖/书法家/用户ID，静态页面为空） */
    targetId?: number;
  };

  /** 浏览历史条目 */
  type VisitHistoryItem = {

    id: number;

    pageType: string;

    pagePath: string;

    pageTitle: string;

    targetId?: number;

    createTime: string;
  };

  /** 浏览历史分页查询参数 */
  type VisitHistoryPageParams = {

    /** 页码（从 1 开始） */
    current: number;

    /** 每页条数 */
    pageSize: number;

    /** 标题搜索关键词（按 page_title 模糊匹配） */
    keyword?: string;
  };
}
