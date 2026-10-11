declare namespace API {

  /**
   * 公告
   */
  type Announcement = {

    /**
     * 公告ID
     */
    id: number;

    /**
     * 公告标题
     */
    title: string;

    /**
     * 公告内容
     */
    content: string;

    /**
     * 状态
     * 0 草稿
     * 1 发布
     * 2 下架
     */
    status: number;

    /**
     * 发布时间
     */
    publishTime?: string;

    /**
     * 创建时间
     */
    createTime?: string;

    /**
     * 更新时间
     */
    updateTime?: string;

  };

   /**
   * 通用返回
   */
  type Result<T> = {

    code:number;

    message:string;

    data:T;

  };

}