declare namespace API {
  type Copybook = {
    id: number;
    name: string;
    calligrapherId: number;
    dynastyId: number;
    style: string;
    imageUrl?: string;
    fileUrl: string;
    description?: string;
    createTime?: string;
    updateTime?: string;
  };

    /**
   * 碑帖分页参数
   */
  type CopybookPageParams = {

    current?: number;

    pageSize?: number;

    dynastyId?: number;

    style?: string;

    keyword?: string;

  };



  /**
   * 分页返回结构
   */
  type PageResult<T> = {

    records:T[];

    total:number;

    size:number;

    current:number;

    pages:number;

  };



  /**
   * web碑帖卡片数据
   */
  type WebCopybookResponse = {


    id:number;


    name:string;


    imageUrl:string;


    shortDescription:string;


    style:string;


    /**
     * 书法家id
     */
    calligrapherId: number;
    calligrapherName:string;


    dynastyName:string;


    viewCount:number;


    favoriteCount:number;


    commentCount:number;


    likeCount:number;


    createTime:string;

  };

  type WebCopybookBannerResponse = {
    id:number;
    name:string;
    imageUrl:string;
  }


  type WebCopybookDetailResponse = {

      id:number;

      name:string;

      imageUrl:string;

      fileUrl:string;


      description:string;
      shortDescription:string;

      transcription:string;

      dimensions:string;


      style:string;

      calligrapherId: number;
      calligrapherName:string;
      calligrapherTag:string;
      calligrapherAvatar: string;

      dynastyName:string;


      viewCount:number;

      favoriteCount:number;

      commentCount:number;

      likeCount:number;


      createTime:string;

  }

  type WebCopybookRecommendResponse = {
    id:number;
    name:string;
    imageUrl:string;
    viewCount:number;
  }

  /**
   * 碑帖单字（已裁剪/待处理）
   *
   * 与后端 CopybookCharacter 实体对应
   */
  type CopybookCharacter = {

    id: number;

    copybookId: number;

    /**
     * 所在页码
     */
    pageNumber?: number;

    /**
     * 识别出的汉字
     */
    characterText?: string;

    x?: number;

    y?: number;

    width?: number;

    height?: number;

    /**
     * OCR 识别置信度
     */
    confidence?: number;

    /**
     * 裁剪后的单字图片地址（MinIO objectName 或完整 URL）
     */
    imageUrl?: string;

    /**
     * 同一页中的排序序号
     */
    sortIndex?: number;

    taskId?: number;

    /**
     * 单字处理状态
     * WAITING / SELECTED / CROPPING / RECOGNIZED / CROPPED / SAVED / FAILED / REJECTED
     */
    status?: string;

    errorMessage?: string;

    createTime?: string;

    updateTime?: string;
  }

  /**
   * 单字临帖页面单字分页查询参数
   */
  type PractiseCharacterPageParams = {

    pageNum?: number;

    pageSize?: number;

    /**
     * 汉字关键词，可为空
     */
    keyword?: string;
  }

  /**
   * 单字临帖页面分页预览图
   */
  type WebPractisePagePreview = {

    /**
     * 页码（从 1 开始）
     */
    pageNumber?: number;

    /**
     * 预览图临时访问地址（原始分辨率，供后续高清查看）
     */
    url?: string;

    /**
     * 低分辨率缩略图地址（页面加载时使用，加载快）
     */
    thumbnailUrl?: string;
  }

  /**
   * 单字临帖页面初始化数据
   */
  type WebPractiseInitResponse = {

    copybookId: number;

    copybookName: string;

    shortDescription?: string;

    /**
     * 释文（"释文对照"竖排展示用，可能为空）
     */
    transcription?: string;

    calligrapherId?: number;

    calligrapherName?: string;

    /**
     * 书法家头像临时访问地址
     */
    calligrapherAvatar?: string;

    /**
     * 原始文件类型：PDF / IMAGE
     */
    fileType?: string;

    fileCount?: number;

    /**
     * 原始文件临时访问地址（第一个文件）
     */
    fileUrl?: string;

    /**
     * 已生成的分页预览图（按页码升序）
     */
    pagePreviews?: WebPractisePagePreview[];
  }

  /**
   * 单字临帖页面单字记录
   */
  type WebPractiseCharacter = {

    id: number;

    characterText?: string;

    /**
     * 单字图片临时访问地址（后端生成，存在有效期）
     */
    imageUrl?: string;

    pageNumber?: number;

    sortIndex?: number;

    status?: string;
  }

  /**
   * 单字临帖页面单字分页响应
   */
  type WebPractiseCharacterPageResponse = {

    records: WebPractiseCharacter[];

    total: number;

    current: number;

    size: number;
  }

  /**
   * 碑帖热搜条目
   *
   * 当前热度来源为碑帖浏览量，按浏览量倒序
   */
  type WebCopybookHotResponse = {

    id: number;

    name: string;

    calligrapherName?: string;

    viewCount?: number;
  }

  type WebCopybookInteractionResponse = {
    /**
     * 点赞数量
     */
    likeCount: number;

    /**
     * 收藏数量
     */
    favoriteCount: number;

    /**
     * 评论数量
     */
    commentCount: number;

    /**
     * 当前用户是否已点赞
     */
    liked: boolean;

    /**
     * 当前用户是否已收藏
     */
    favorited: boolean;
  }

  type CopybookCommentPageParams = {
    current?: number;
    pageSize?: number;
  }

  type CreateCopybookCommentRequest = {
    content: string;
    parentId?: number;
  }

  type WebCopybookCommentResponse = {
    id: number;
    parentId: number;
    rootId: number;
    userId: number;
    username: string;
    avatarUrl?: string;
    replyUserId?: number;
    replyUsername?: string;
    content: string;
    createTime: string;
    deleted?: boolean;
    replies: WebCopybookCommentResponse[];
  }
}
