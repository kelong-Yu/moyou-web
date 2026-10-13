import request from "../request";

/**
 * 获取书法家地理位置
 * GET /api/web/calligrapher/location
 *
 * @param dynastyId 朝代ID，不传则查询全部
 */
export async function getCalligrapherLocation(
  dynastyId?: number,
  options?: { [key: string]: any }
) {
  return request<API.Result<API.CalligrapherLocation[]>>(
    "/api/web/calligrapher/location",
    {
      method: "GET",
      params: {
        dynastyId,
      },
      ...(options || {}),
    }
  );
}

/**
 * 获取书法家详情
 * GET /api/web/calligrapher/detail/{id}
 */
export async function getCalligrapherDetailDrawer(
  id:number | string,
  options?:{[key:string]:any}
){

  return request<API.Result<API.CalligrapherDetail>>(
    `/api/web/calligrapher/detail/${id}`,
    {
      method:'GET',
      ...(options || {})
    }
  );

}

/**
 * 获取全部书法家列表
 * GET /api/web/calligrapher/list
 */
export async function getCalligrapherList(
    options?: {[key:string]:any}
){
    return request<API.Result<API.Calligrapher[]>>(
        '/api/web/calligrapher/list',
        {
            method:'GET',
            ...(options || {})
        }
    );
}

/**
 * 获取书法家全部作品
 * GET /api/web/calligrapher/${id}/works
 */
export async function getCalligrapherWorks(
    id: number,
    options?: {[key:string]:any}
){
    return request<API.Result<API.CalligrapherWorksResponse[]>>(
        `/api/web/calligrapher/${id}/works`,
        {
            method:'GET',
            ...(options || {})
        }
    );
}

/**
 * 书法家关注状态 + 真实粉丝数
 * GET /api/web/calligrapher/${id}/follow-status
 *
 * 游客可访问：followed 恒为 false，粉丝数为真实统计
 */
export async function getCalligrapherFollowStatus(
    id: number,
    options?: {[key:string]:any}
){
    return request<API.Result<API.CalligrapherFollowStatus>>(
        `/api/web/calligrapher/${id}/follow-status`,
        {
            method:'GET',
            ...(options || {})
        }
    );
}

/** 关注书法家 POST /api/web/calligrapher/${id}/follow（需要登录） */
export async function followCalligrapher(
    id: number,
    options?: {[key:string]:any}
){
    return request<API.Result<null>>(
        `/api/web/calligrapher/${id}/follow`,
        {
            method:'POST',
            ...(options || {})
        }
    );
}

/** 取消关注书法家 DELETE /api/web/calligrapher/${id}/follow（需要登录） */
export async function unfollowCalligrapher(
    id: number,
    options?: {[key:string]:any}
){
    return request<API.Result<null>>(
        `/api/web/calligrapher/${id}/follow`,
        {
            method:'DELETE',
            ...(options || {})
        }
    );
}

/**
 * 书法家的真实粉丝列表
 * GET /api/web/calligrapher/${id}/followers
 *
 * 游客可访问；followed 表示当前登录用户是否已关注该粉丝用户
 */
export async function getCalligrapherFollowers(
    id: number,
    options?: {[key:string]:any}
){
    return request<API.Result<API.UserProfileCard[]>>(
        `/api/web/calligrapher/${id}/followers`,
        {
            method:'GET',
            ...(options || {})
        }
    );
}