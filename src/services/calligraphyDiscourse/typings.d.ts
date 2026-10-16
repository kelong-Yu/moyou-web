declare namespace API {

  /**
   * 书论（前台「每日书论」展示用）
   *
   * 对应后端 calligraphy_discourse 表，字段与后台书论管理一致。
   */
  type CalligraphyDiscourse = {
    id: number;

    /** 书论标题 */
    title: string;

    /** 书论原文 */
    content: string;

    /** 作者 */
    author: string;

    /** 朝代 */
    dynasty: string;

    /** 所属书籍，例如《翰林要诀》 */
    bookTitle: string;

    /** 原文来源链接，可能为空 */
    sourceUrl?: string;

    createTime?: string;

    updateTime?: string;
  };
}
