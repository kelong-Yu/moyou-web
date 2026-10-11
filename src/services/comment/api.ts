import request from "../request";

export async function getCopybookComments(
    copybookId: number,
    params: API.CopybookCommentPageParams = {}
) {
    return request<API.Result<API.PageResult<API.WebCopybookCommentResponse>>>(
        `/api/web/copybook/${copybookId}/comments`,
        {
            method: "GET",
            params,
        }
    );
}

export async function createCopybookComment(
    copybookId: number,
    body: API.CreateCopybookCommentRequest
) {
    return request<API.Result<number>>(
        `/api/web/copybook/${copybookId}/comment`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            data: body,
        }
    );
}

export async function deleteCopybookComment(copybookId: number, commentId: number) {
    return request<API.Result<null>>(
        `/api/web/copybook/${copybookId}/comment/${commentId}`,
        { method: "DELETE" }
    );
}
