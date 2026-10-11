import request from "../request";


/**
 * 获取公告列表 GET /api/web/announcement/list
 */
export async function getAnnouncementList(
  options?: { [key:string]: any }
) {

  return request<API.Result<API.Announcement[]>>(
    '/api/web/announcement/list',
    {
      method:'GET',
      ...(options || {}),
    }
  );

}