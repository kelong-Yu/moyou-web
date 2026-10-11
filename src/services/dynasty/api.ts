import request from "../request";


/**
 * 获取朝代列表 GET /api/web/dynasty/list
 */
export async function getDynastyList(
  options?: { [key:string]: any }
) {
  return request<API.Result<API.Dynasty[]>>(
    '/api/web/dynasty/list',
    {
      method:'GET',
      ...(options || {}),
    }
  );

}