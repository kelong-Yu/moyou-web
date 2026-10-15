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
