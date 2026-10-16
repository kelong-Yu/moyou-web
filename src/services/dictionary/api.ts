import request from "../request";

/**
 * 书法字典 · 跨碑帖分页查询已裁切单字
 *
 * GET /api/web/dictionary/characters
 *
 * 复用墨友已有的 OCR + 裁切数据（copybook_character），
 * 按单个汉字精确匹配，style 传字体关键词时后端在数据库层筛选，
 * 返回真实总数与分页信息；图片为 MinIO 临时访问地址（约 10 分钟有效）。
 */
export async function getDictionaryCharacters(
  params: API.DictionaryCharacterPageParams
) {
  return request<API.Result<API.WebDictionaryCharacterPageResponse>>(
    "/api/web/dictionary/characters",
    {
      method: "GET",
      params,
    }
  );
}

/**
 * 书法字典 · 页头旋转字环 / 推荐单字展示列表
 *
 * GET /api/web/dictionary/showcase?size=
 *
 * 热门碑帖优先去重后随机取样，图片同为 MinIO 临时访问地址，
 * 失败时前端静默隐藏字环与推荐列表，不影响搜索主流程。
 *
 * @param size 请求数量（默认 18 = 内环 6 + 外环 12），上限 30
 */
export async function getDictionaryShowcase(size?: number) {
  return request<API.Result<API.WebDictionaryCharacter[]>>(
    "/api/web/dictionary/showcase",
    {
      method: "GET",
      params: size ? { size } : undefined,
    }
  );
}
