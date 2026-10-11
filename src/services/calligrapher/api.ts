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