import request from "../request";

/** 获取当前的用户 GET /api/web/user/currentUser */
export async function currentUser(options?: { [key: string]: any }) {
  return request<{
    data: API.CurrentUser;
  }>('/api/web/user/currentUser', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 登录接口 POST /api/web/user/login */
export async function login(body: API.LoginParams, options?: { [key: string]: any }) {
  return request<API.LoginResult>('/api/web/user/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 注册接口 POST /api/web/user/register */
export async function register(body: API.RegisterParams, options?: { [key: string]: any }) {
  return request<API.RegisterResult>('/api/web/user/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}



/**
 * 发送邮箱验证码
 *
 * 后端：POST /api/web/user/email/sendCode?email=xxx&scene=register&captchaToken=xxx
 *
 * @param email        收件邮箱
 * @param scene        业务场景：register-注册 / reset-找回密码
 * @param captchaToken 滑块人机验证通过后下发的一次性凭证
 */
export async function sendEmailCode(
  email: string,
  scene: "register" | "reset" = "register",
  captchaToken?: string
) {
  return request<API.SendCodeResult>(
    '/api/web/user/email/sendCode',
    {
      method: 'POST',
      params: {
        email,
        scene,
        captchaToken,
      },
      //多给点时间，防止超时
      timeout: 20000,
    }
  );
}

/**
 * 找回密码（重置密码，未登录）
 * POST /api/web/user/resetPassword
 */
export async function resetPassword(body: API.ResetPasswordParams) {
  return request<API.Result<boolean>>('/api/web/user/resetPassword', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
  });
}

/**
 * 修改密码（已登录，需校验原密码）
 * POST /api/web/user/changePassword
 */
export async function changePassword(body: API.ChangePasswordParams) {
  return request<API.Result<boolean>>('/api/web/user/changePassword', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
  });
}


/** 退出登录接口 POST /api/web/user/logout */
export async function outLogin(options?: { [key: string]: any }) {
  return request<{
    code?: number;
    message?: string;
    data?: boolean
  }>('/api/web/user/logout', {
    method: 'POST',
    ...(options || {}),
  });
}

/**
 * 编辑个人资料 POST /api/web/user/update（需要登录）
 *
 * 仅允许修改昵称、手机号、个人简介、性别，
 * 返回更新后的脱敏资料（前端据其刷新 Redux）。
 */
export async function updateOwnProfile(
  params: API.UserProfileUpdateParams,
  options?: { [key: string]: any }
) {
  return request<API.Result<API.CurrentUser>>(
    '/api/web/user/update',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: params,
      ...(options || {}),
    }
  );
}

/** 用户公开资料 GET /api/web/user/{id}/profile（游客可访问） */
export async function getUserProfile(userId: number) {
  return request<API.Result<API.UserProfile>>(
    `/api/web/user/${userId}/profile`,
    {
      method: 'GET',
    }
  );
}

/**
 * 用户的关注列表（分页）GET /api/web/user/{id}/following?pageNum&pageSize
 *
 * 游客可访问；条目 type 区分用户 / 书法家，分别跳转 /user/{id} 与 /aritcleWorks/{id}。
 * records 元素为后端 FollowingItemResponse。
 *
 * 返回类型保留了裸数组分支：后端分页改造上线前该接口仍返回 List，
 * 由 normalizeFollowPage 统一收敛为分页体并标记降级。
 */
export async function getUserFollowingPage(
  userId: number,
  params: API.WebUserFollowPageParams = {}
) {
  return request<
    API.Result<API.WebUserFollowingPageResponse | API.FollowingItem[]>
  >(`/api/web/user/${userId}/following`, {
    method: 'GET',
    params,
  });
}

/**
 * 用户的粉丝列表（分页）GET /api/web/user/{id}/followers?pageNum&pageSize
 *
 * 游客可访问；followed 表示当前登录用户是否已回关列表中的用户。
 * records 元素为后端 UserProfileCardResponse。
 */
export async function getUserFollowersPage(
  userId: number,
  params: API.WebUserFollowPageParams = {}
) {
  return request<
    API.Result<API.WebUserFollowersPageResponse | API.UserProfileCard[]>
  >(`/api/web/user/${userId}/followers`, {
    method: 'GET',
    params,
  });
}

/**
 * 分页返回体规范化
 *
 * 兼容三种情况，避免后端未就绪时页面直接崩掉：
 * 1. 标准分页体 { records, total, current, size } → 原样采纳，缺失字段回退到请求值；
 * 2. 裸数组（后端分页改造前的形状）→ 前端按 pageNum/pageSize 切片，degraded 置 true；
 * 3. 其他任意形状 → 返回 null，由调用方按"加载失败"处理并提示。
 *
 * 只做形状收敛，不改任何业务字段。
 */
export function normalizeFollowPage<T>(
  data: unknown,
  requested: { pageNum: number; pageSize: number }
): API.NormalizedFollowPage<T> | null {
  const { pageNum, pageSize } = requested;

  if (Array.isArray(data)) {
    const all = data as T[];
    const start = (pageNum - 1) * pageSize;
    return {
      records: all.slice(start, start + pageSize),
      total: all.length,
      current: pageNum,
      size: pageSize,
      degraded: true,
    };
  }

  if (data && typeof data === "object") {
    const raw = data as {
      records?: unknown;
      total?: unknown;
      current?: unknown;
      size?: unknown;
    };
    if (!Array.isArray(raw.records)) return null;

    const records = raw.records as T[];
    return {
      records,
      total:
        typeof raw.total === "number" && Number.isFinite(raw.total)
          ? raw.total
          : records.length,
      current:
        typeof raw.current === "number" && Number.isFinite(raw.current)
          ? raw.current
          : pageNum,
      size:
        typeof raw.size === "number" && Number.isFinite(raw.size) && raw.size > 0
          ? raw.size
          : pageSize,
      degraded: false,
    };
  }

  return null;
}

/** 关注用户 POST /api/web/user/{id}/follow（需要登录） */
export async function followUser(userId: number) {
  return request<API.Result<null>>(
    `/api/web/user/${userId}/follow`,
    {
      method: 'POST',
    }
  );
}

/** 取消关注 DELETE /api/web/user/{id}/follow（需要登录） */
export async function unfollowUser(userId: number) {
  return request<API.Result<null>>(
    `/api/web/user/${userId}/follow`,
    {
      method: 'DELETE',
    }
  );
}