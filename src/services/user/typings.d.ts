declare namespace API {

  type CurrentUser = {
    username?: string;
    userAccount?: string;
    avatarUrl?: string;
    id: number;
    gender?: number;
    email?: string;
    status?: number;
    role?: number;
    createTime?: string;
    updateTime?: string;
    signature?: string;
    title?: string;
    group?: string;
    tags?: { key?: string; label?: string }[];
    notifyCount?: number;
    unreadCount?: number;
    country?: string;
    access?: string;
    geographic?: {
      province?: { label?: string; key?: string };
      city?: { label?: string; key?: string };
    };
    address?: string;
    phone?: string;
    /** 个人简介（编辑资料使用，数据库已新增该字段） */
    signature?: string;
  };

  /**
   * Web端编辑个人资料请求参数
   */
  type UserProfileUpdateParams = {
    username?: string;
    phone?: string;
    signature?: string;
    gender?: number;
  };

  type LoginResult = {
    code?: number;
    message?: string;
    data?: string;
    status?: string;
    type?: string;
    currentAuthority?: string;
  };

  type RegisterResult = {
    code?: number;
    message?: string;
    data?: number;
  };

  /**
   * 发送验证码返回结果
   */
  type SendCodeResult = {
    code?: number;
    message?: string;
    data?: string;
  };

  /**
   * 用户公开资料（个人主页 Hero 使用）
   *
   * 包含真实的关注/粉丝统计与当前登录用户的关注状态
   */
  type UserProfile = {
    id: number;
    username?: string;
    userAccount?: string;
    avatarUrl?: string;
    gender?: number;
    role?: number;
    createTime?: string;
    followingCount?: number;
    followerCount?: number;
    /** 当前登录用户是否已关注该用户 */
    followed?: boolean;
  };

  /**
   * 用户公开资料卡片（粉丝列表条目）
   */
  type UserProfileCard = {
    id: number;
    username?: string;
    userAccount?: string;
    avatarUrl?: string;
    role?: number;
    createTime?: string;
    /** 当前登录用户是否已关注该用户 */
    followed?: boolean;
  };

  /**
   * 个人主页"关注列表"条目
   *
   * type = user        → 关注的用户，跳转 /user/{targetId}，取消走用户取关接口
   * type = calligrapher → 关注的书法家，跳转 /aritcleWorks/{targetId}，取消走书法家取关接口
   */
  type FollowingItem = {
    type: "user" | "calligrapher";
    targetId: number;
    name?: string;
    avatarUrl?: string;
    role?: number;
    subtitle?: string;
    createTime?: string;
  };

  /**
   * 登录参数
   *
   * userAccount 可以填写：
   * 1. 用户账号
   * 2. 用户邮箱
   */
  type LoginParams = {
    userAccount?: string;
    userPassword?: string;
    autoLogin?: boolean;
    type?: string;
    /** 滑块人机验证通过后下发的一次性凭证 */
    captchaToken?: string;
  };

  /**
   * 注册参数
   */
  type RegisterParams = {
    email?: string;
    code?: string;
    userAccount?: string;
    checkPassword?: string;
    userPassword?: string;
  };

  /**
   * 找回密码（重置密码）参数
   */
  type ResetPasswordParams = {
    email?: string;
    code?: string;
    newPassword?: string;
    checkPassword?: string;
  };

  /**
   * 修改密码参数（已登录）
   */
  type ChangePasswordParams = {
    oldPassword?: string;
    newPassword?: string;
    checkPassword?: string;
  };
}