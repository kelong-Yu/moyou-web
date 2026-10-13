import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../stores";
import { reportVisit } from "../services/history/api";

/** 站点名：浏览器标签标题统一为「页面名称 - 墨友」 */
export const SITE_NAME = "墨友";

/** 页面业务类型（与后端 visit_history.page_type 字段值前后端共用一套） */
export type VisitPageType =
    | "home"              // 首页
    | "copybook_list"     // 碑帖字库
    | "copybook"          // 碑帖详情
    | "practise"          // 单字临帖
    | "calligrapher_list" // 书家列传
    | "calligrapher"      // 书法家主页
    | "user"              // 用户个人主页
    | "search"            // 搜索
    | "agent";            // 小墨Agent

export interface PageMetaOptions {

    /** 简洁页面名：同时用于浏览器标签标题与浏览历史 page_title（不含「 - 墨友」后缀） */
    title: string;

    /** 页面业务类型；record=true 时必须提供 */
    pageType?: VisitPageType;

    /** 详情页业务对象ID（碑帖/书法家/用户ID） */
    targetId?: number | null;

    /** 数据是否就绪：详情页取得真实名称后才设置标题并上报，避免空标题/默认标题/上一页标题 */
    ready?: boolean;

    /** 是否记录浏览历史（设置页、登录/注册等非内容页传 false） */
    record?: boolean;
}

/** 最近上报记录：dedupeKey -> 上报时间戳，用于同一次访问去重 */
const reportedVisits = new Map<string, number>();

/** 去重时间窗（毫秒）：覆盖 React 开发模式 StrictMode 下 Effect 双执行 */
const DEDUPE_WINDOW_MS = 2000;

/**
 * 统一页面元信息 Hook：浏览器标签标题 + 浏览历史上报
 *
 * 全站页面名称只在本 Hook 的调用点维护一份：
 *   · document.title = `${title} - 墨友`
 *   · 浏览历史 page_title = title（简洁页面名，非完整标签标题）
 *
 * 规则：
 *   1. ready 且 title 非空才设置标题、才上报；
 *   2. 仅登录用户上报（后端按 JWT 关联用户ID），游客静默跳过；
 *   3. 同一（路径 + targetId）在去重窗口内只上报一次，
 *      防止 StrictMode 双执行与依赖变化造成重复记录；
 *   4. 上报失败静默，不阻塞页面。
 */
export function usePageMeta({
    title,
    pageType,
    targetId,
    ready = true,
    record = true,
}: PageMetaOptions) {

    const location = useLocation();
    const userInfo = useSelector((state: RootState) => state.user.userInfo);

    // ==================== 浏览器标签标题 ====================
    useEffect(() => {
        if (ready && title) {
            document.title = `${title} - ${SITE_NAME}`;
        }
    }, [title, ready]);

    // ==================== 浏览历史上报 ====================
    useEffect(() => {
        if (!record || !ready || !title || !pageType || !userInfo) {
            return;
        }

        const pagePath = location.pathname;
        const dedupeKey = `${pagePath}|${targetId ?? ""}`;
        const now = Date.now();

        const lastReportedAt = reportedVisits.get(dedupeKey);
        if (
            lastReportedAt !== undefined &&
            now - lastReportedAt < DEDUPE_WINDOW_MS
        ) {
            return;
        }
        reportedVisits.set(dedupeKey, now);

        reportVisit({
            pageType,
            pagePath,
            pageTitle: title,
            targetId: targetId ?? undefined,
        }).catch(() => {
            // 浏览历史上报失败静默处理，不干扰页面正常使用
        });
    }, [record, ready, title, pageType, targetId, location.pathname, userInfo]);
}
