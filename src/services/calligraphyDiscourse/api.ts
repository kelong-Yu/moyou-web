import request from "../request";

/**
 * 每日书论 · 随机取一条
 *
 * GET /api/web/calligraphy-discourse/random?excludeId=
 *
 * 换一换时传入当前展示的书论 id，避免连续两次取到同一条；
 * 库中仅有这一条时后端返回 data = null，前端保持当前展示不变。
 */
export async function getRandomDiscourse(excludeId?: number) {
  return request<API.Result<API.CalligraphyDiscourse>>(
    "/api/web/calligraphy-discourse/random",
    {
      method: "GET",
      params: excludeId ? { excludeId } : undefined,
    }
  );
}
