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