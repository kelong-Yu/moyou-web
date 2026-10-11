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
}