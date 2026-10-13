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
 * 后端：
 * POST /api/web/user/email/sendCode?email=xxx@qq.com
 */
export async function sendEmailCode(email: string) {
  return request<API.SendCodeResult>(
    '/api/web/user/email/sendCode',
    {
      method: 'POST',
      params: {
        email,
      },
      //多给点时间，防止超时
      timeout: 20000,
    }
  );
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

/** 用户的关注列表 GET /api/web/user/{id}/following（游客可访问，含用户与书法家两类） */
export async function getUserFollowing(userId: number) {
  return request<API.Result<API.FollowingItem[]>>(
    `/api/web/user/${userId}/following`,
    {
      method: 'GET',
    }
  );
}

/** 用户的粉丝列表 GET /api/web/user/{id}/followers（游客可访问） */
export async function getUserFollowers(userId: number) {
  return request<API.Result<API.UserProfileCard[]>>(
    `/api/web/user/${userId}/followers`,
    {
      method: 'GET',
    }
  );
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