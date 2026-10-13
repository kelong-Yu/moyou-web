declare namespace API {

  /** 我的消息 · 系统通知条目（read 为当前登录用户的已读状态） */
  type MessageAnnouncementItem = {

    id: number;

    title: string;

    content: string;

    publishTime?: string;

    read?: boolean;
  };

  /** 我的消息 · 评论互动条目（其他用户回复我的评论） */
  type MessageCommentItem = {

    /** 回复评论ID（已读状态绑定在该ID上） */
    id: number;

    fromUserId: number;

    fromUsername: string;

    fromAvatarUrl?: string;

    /** 对方回复的内容 */
    content: string;

    createTime?: string;

    /** 所属碑帖（跳转详情页用） */
    copybookId: number;

    copybookName: string;

    /** 我的原始评论ID */
    originCommentId?: number;

    /** 我的原始评论内容（已删除时为提示文案） */
    originCommentContent?: string;

    read?: boolean;
  };

  /** 我的消息 · 我的评论条目（仅查看，无已读状态） */
  type MessageMyCommentItem = {

    /** 我的评论ID（跳转定位用） */
    id: number;

    /** 我发表的评论内容 */
    content: string;

    createTime?: string;

    /** 所属碑帖（跳转详情页用） */
    copybookId: number;

    copybookName: string;

    /** 父评论ID（0=顶层评论，非0=回复） */
    parentId?: number;

    /** 回复目标昵称（顶层评论为空） */
    replyUsername?: string;

    /** 被回复评论内容（顶层评论为空） */
    originCommentContent?: string;
  };

  /** 我的消息 · 两类未读数量 */
  type MessageUnreadCounts = {

    announcementUnread: number;

    commentUnread: number;
  };

  /** 消息类型（与后端 message_read.message_type 一致） */
  type MessageType = "announcement" | "comment";
}
