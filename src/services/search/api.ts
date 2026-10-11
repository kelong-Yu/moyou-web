import request from "../request";


/**
 * 综合搜索
 * GET /api/web/search
 */
export async function search(
    params: API.SearchQueryRequest,
    options?: Record<string, any>
){
    return request<API.Result<API.SearchTotalResponse>>(
        "/api/web/search",
        {
            method:"GET",
            params,
            ...(options || {})
        }
    );
}