import { useRef, useState } from "react";
import { normalizeFollowPage } from "../../../services/user/api";

/** 接口异常（网络层失败 / 非 200 且后端没给文案）时的统一提示 */
const DEFAULT_ERROR = "列表加载失败，请稍后重试";

/**
 * code 200 但 data 既不是分页体也不是数组
 *
 * 说明返回形状与冻结契约不符，明确告知，而不是白屏或渲染脏数据。
 */
const SHAPE_ERROR = "接口返回结构不符合分页契约，请稍后重试";

/**
 * 调用方绑定的具体接口（关注 / 粉丝各一个）
 *
 * 直接传 services 里的模块级函数（getUserFollowingPage 等），
 * 签名一致且引用稳定，因此不需要在 hook 里用 ref 兜住。
 */
export type FetchFollowPage = (
    userId: number,
    params: API.WebUserFollowPageParams
) => Promise<API.Result<unknown>>;

export type FollowPagedList<T> = {
    /** 当前页条目 */
    records: T[];

    total: number;

    pageNum: number;

    pageSize: number;

    /** 进入 tab 与翻页的加载中；refresh 不置位，避免列表闪成 loading */
    loading: boolean;

    error: string | null;

    /** 后端尚未返回分页体（仍返回裸 List），分页由前端临时切片 */
    degraded: boolean;

    /** 拉取某用户的第 page 页：进入 tab、翻页时调用 */
    load: (userId: number, page?: number) => void;

    /** 静默重查当前页：关注状态变更后与数据库对齐 */
    refresh: () => void;

    /**
     * 按关键字重查（回到第 1 页）
     *
     * 关键字走服务端 LIKE，所以搜的是全部关注/粉丝，不只是当前页。
     * 传空串等价于清除关键字。
     */
    search: (keyword: string) => void;

    /** 失败后重试当前页：带 loading 占位，区别于静默刷新 */
    retry: () => void;

    /** 就地改写已加载条目（回关按钮翻转 followed），不触发请求 */
    patchRecords: (updater: (rows: T[]) => T[]) => void;
};

/**
 * 关注 / 粉丝分页列表
 *
 * 分页与关键字过滤都由服务端决定（pageNum / pageSize / keyword 走 query），
 * 组件只持有"当前页 + 服务端给的总数"，因此搜索覆盖全部关注/粉丝而非当前页。
 *
 * 竞态：每次请求分配自增序号，晚返回的旧请求直接丢弃，
 * 快速连点页码或连续输入关键字时，列表始终与最后一次请求一致。
 */
const useFollowPagedList = <T>({
    pageSize,
    fetchPage,
}: {
    pageSize: number;
    fetchPage: FetchFollowPage;
}): FollowPagedList<T> => {
    const [records, setRecords] = useState<T[]>([]);
    const [total, setTotal] = useState(0);
    const [pageNum, setPageNum] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [degraded, setDegraded] = useState(false);

    /** 当前列表属于哪个用户：切换查看对象时据此清空旧数据 */
    const ownerRef = useRef<number | undefined>(undefined);
    const pageNumRef = useRef(1);
    const requestIdRef = useRef(0);

    /** 服务端过滤关键字；用 ref 而非 state，避免为它多渲染一次 */
    const keywordRef = useRef<string | undefined>(undefined);

    /**
     * 拉取一页
     *
     * 写成函数声明而非 useCallback：内部要处理页码越界重查（递归），
     * 且只在事件回调与 effect 中被调用，不需要稳定身份。
     */
    function run(userId: number, page: number, withLoading: boolean) {
        if (ownerRef.current !== userId) {
            ownerRef.current = userId;
            setRecords([]);
            setTotal(0);
            setDegraded(false);
        }

        pageNumRef.current = page;
        setPageNum(page);
        setError(null);
        if (withLoading) setLoading(true);

        const requestId = ++requestIdRef.current;

        fetchPage(userId, {
            pageNum: page,
            pageSize,
            keyword: keywordRef.current,
        })
            .then((res) => {
                // 晚返回的旧请求丢弃
                if (requestId !== requestIdRef.current) return;

                if (res.code !== 200) {
                    setError(res.message || DEFAULT_ERROR);
                    return;
                }

                const next = normalizeFollowPage<T>(res.data, {
                    pageNum: page,
                    pageSize,
                });

                if (!next) {
                    setError(SHAPE_ERROR);
                    return;
                }

                // 页码越界（取关后末页变空、total 变小等）：回退到最后一页重查一次
                const size = next.size || pageSize;
                const lastPage = Math.max(1, Math.ceil(next.total / size));
                if (next.records.length === 0 && next.total > 0 && page > lastPage) {
                    run(userId, lastPage, withLoading);
                    return;
                }

                setRecords(next.records);
                setTotal(next.total);
                setDegraded(next.degraded);
            })
            .catch(() => {
                if (requestId !== requestIdRef.current) return;
                setError(DEFAULT_ERROR);
            })
            .finally(() => {
                // 越界重查已占用更新的序号，此处不能提前收尾 loading
                if (requestId !== requestIdRef.current) return;
                if (withLoading) setLoading(false);
            });
    }

    const reloadCurrentPage = (withLoading: boolean) => {
        const owner = ownerRef.current;
        if (owner == null) return;
        run(owner, pageNumRef.current, withLoading);
    };

    return {
        records,
        total,
        pageNum,
        pageSize,
        loading,
        error,
        degraded,
        load: (userId, page) => run(userId, page ?? pageNumRef.current, true),
        refresh: () => reloadCurrentPage(false),
        retry: () => reloadCurrentPage(true),
        search: (keyword) => {
            const next = keyword.trim() || undefined;

            if (next === keywordRef.current) {
                return;
            }

            keywordRef.current = next;

            const owner = ownerRef.current;

            // 尚未加载过该用户的列表：记下关键字即可，
            // 之后进入 tab 发起的首次请求会自动带上
            if (owner == null) return;

            run(owner, 1, true);
        },
        patchRecords: setRecords,
    };
};

export default useFollowPagedList;
