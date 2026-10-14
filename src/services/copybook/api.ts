import request from "../request";

/**
 * 首页获取最新碑帖列表 GET /api/web/copybook/list
 */
export async function getNewCopybookList(
  options?: { [key:string]: any }
) {

  return request<API.Result<API.Copybook[]>>(
    '/api/web/copybook/list',
    {
      method:'GET',
      ...(options || {}),
    }
  );

}


/**
 * 碑帖页面分页列表
 * GET /api/web/copybook/page
 */
export async function getCopybookPage(
  params: API.CopybookPageParams
) {

  return request<API.Result<API.PageResult<API.WebCopybookResponse>>>(
    "/api/web/copybook/page",
    {
      method: "GET",
      params,
    }
  );

}


/**
 * 碑帖页banner列表
 * GET /api/web/copybook/page
 */
export async function getBannerCopybook(){
    return request<API.Result<API.WebCopybookBannerResponse[]>>(
        "/api/web/copybook/banner",
        {
            method:"GET"
        }
    );
}

/**
 * 获取碑帖详情
 */
export async function getCopybookDetail(
    id:number
){
    return request<API.Result<API.WebCopybookDetailResponse>>(
        `/api/web/copybook/${id}`,
        {
            method:"GET"
        }
    );

}


/**
 * 碑帖详情页猜你想看
 */
export function getRecommendCopybook(id:number){

    return request<API.Result<API.WebCopybookRecommendResponse[]>>(
        `/api/web/copybook/recommend/${id}`,
        {
            method:"GET"
        }
    )

}

/**
 * 点赞碑帖
 *
 * POST /api/web/copybook/{copybookId}/like
 */
export async function likeCopybook(
    copybookId: number
) {

    return request<API.Result<null>>(
        `/api/web/copybook/${copybookId}/like`,
        {
            method: "POST",
        }
    );

}


/**
 * 取消点赞
 *
 * DELETE /api/web/copybook/{copybookId}/like
 */
export async function unlikeCopybook(
    copybookId: number
) {

    return request<API.Result<null>>(
        `/api/web/copybook/${copybookId}/like`,
        {
            method: "DELETE",
        }
    );

}

/**
 * 收藏碑帖
 *
 * POST /api/web/copybook/{copybookId}/favorite
 */
export async function favoriteCopybook(
    copybookId: number
) {

    return request<API.Result<null>>(
        `/api/web/copybook/${copybookId}/favorite`,
        {
            method: "POST",
        }
    );

}


/**
 * 取消收藏
 *
 * DELETE /api/web/copybook/{copybookId}/favorite
 */
export async function unFavoriteCopybook(
    copybookId: number
) {

    return request<API.Result<null>>(
        `/api/web/copybook/${copybookId}/favorite`,
        {
            method: "DELETE",
        }
    );

}


/**
 * 单字临帖页面初始化数据
 *
 * GET /api/web/copybook/practise/{copybookId}/init
 *
 * 返回碑帖/书法家信息、原始文件信息、
 * 已生成页面预览图的临时访问地址列表。
 */
export async function getPractiseInit(
    copybookId: number
) {
    return request<API.Result<API.WebPractiseInitResponse>>(
        `/api/web/copybook/practise/${copybookId}/init`,
        {
            method: "GET",
        }
    );
}

/**
 * 临帖页单页 MinIO 原文件高清大图地址
 *
 * GET /api/web/copybook/practise/{copybookId}/page/{pageNumber}/full
 *
 * 直接返回图片字节（不做缩略压缩），
 * 供"点击查看大图"的 <img> 地址使用：
 * 多图组返回该页原始上传文件，PDF/历史数据返回整页高清预览。
 *
 * 与缩略图同样走后端接口而非 MinIO 预签名地址，
 * 不受临时地址有效期影响；
 * 返回值再拼 "/api" 前缀是为配合开发代理的 /api 重写，
 * 与临帖页现有 thumbnailUrl 用法一致。
 */
export function getPractisePageFullImageUrl(
    copybookId: number,
    pageNumber: number
): string {
    return `/api/api/web/copybook/practise/${copybookId}/page/${pageNumber}/full`;
}

/**
 * 单字临帖页面已裁剪单字分页查询
 *
 * GET /api/web/copybook/practise/{copybookId}/characters
 *
 * 只返回已有单字图片的记录，
 * keyword 按汉字内容模糊匹配。
 * 单字图片字段为后端生成的临时访问地址。
 */
export async function getPractiseCharacters(
    copybookId: number,
    params: API.PractiseCharacterPageParams
) {
    return request<API.Result<API.WebPractiseCharacterPageResponse>>(
        `/api/web/copybook/practise/${copybookId}/characters`,
        {
            method: "GET",
            params,
        }
    );
}

/**
 * 碑帖热搜列表
 *
 * GET /api/web/copybook/practise/hot
 *
 * 当前热度数据来源为碑帖浏览量（view_count）倒序。
 */
export async function getHotCopybooks(
    limit?: number
) {
    return request<API.Result<API.WebCopybookHotResponse[]>>(
        "/api/web/copybook/practise/hot",
        {
            method: "GET",
            params: limit ? { limit } : undefined,
        }
    );
}


/**
 * 当前用户收藏的碑帖列表
 *
 * GET /api/web/copybook/favorites
 *
 * 需要登录，按收藏时间倒序，
 * 返回碑帖卡片数据（复用 WebCopybookResponse）。
 */
export async function getMyFavoriteCopybooks() {
  return request<API.Result<API.WebCopybookResponse[]>>(
    '/api/web/copybook/favorites',
    {
      method: 'GET',
    }
  );
}


/**
 * 当前用户收藏的单字列表
 *
 * GET /api/web/character/favorites
 *
 * 需要登录，按收藏时间倒序，图片为临时访问地址。
 */
export async function getMyFavoriteCharacters() {
  return request<API.Result<API.CharacterFavoriteItem[]>>(
    '/api/web/character/favorites',
    {
      method: 'GET',
    }
  );
}

/** 单字收藏状态 GET /api/web/character/{characterId}/favorite-status（游客可访问） */
export async function getCharacterFavoriteStatus(characterId: number) {
  return request<API.Result<boolean>>(
    `/api/web/character/${characterId}/favorite-status`,
    {
      method: 'GET',
    }
  );
}

/** 收藏单字 POST /api/web/character/{characterId}/favorite（需要登录） */
export async function favoriteCharacter(characterId: number) {
  return request<API.Result<null>>(
    `/api/web/character/${characterId}/favorite`,
    {
      method: 'POST',
    }
  );
}

/** 取消收藏单字 DELETE /api/web/character/{characterId}/favorite（需要登录） */
export async function unfavoriteCharacter(characterId: number) {
  return request<API.Result<null>>(
    `/api/web/character/${characterId}/favorite`,
    {
      method: 'DELETE',
    }
  );
}


/**
 * 获取碑帖互动信息
 *
 * 游客也可以访问：
 * - 返回点赞数
 * - 返回收藏数
 * - 返回评论数
 * - liked / favorited 在游客情况下为 false
 *
 * 登录用户：
 * - 返回当前用户的点赞、收藏状态
 *
 * @param copybookId 碑帖ID
 */
export async function getCopybookInteraction (copybookId : number){
    return request<API.Result<API.WebCopybookInteractionResponse>>(
        `/api/web/copybook/${copybookId}/interaction`,
        {
            method:"GET"
        }
    );
}
