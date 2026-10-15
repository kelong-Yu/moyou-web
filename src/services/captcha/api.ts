import request from "../request";

/**
 * 获取一道滑块拼图验证码
 * GET /api/web/captcha/slider
 */
export async function getSliderCaptcha() {
  return request<API.Result<API.SliderCaptcha>>("/api/web/captcha/slider", {
    method: "GET",
  });
}

/**
 * 校验滑块拼图，通过后返回一次性 captchaToken
 * POST /api/web/captcha/verify
 */
export async function verifySliderCaptcha(body: API.SliderCaptchaVerifyParams) {
  return request<API.Result<API.SliderCaptchaVerifyResult>>(
    "/api/web/captcha/verify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      data: body,
    }
  );
}
