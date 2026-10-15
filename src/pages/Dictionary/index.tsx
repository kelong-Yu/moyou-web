import { useEffect, useRef, useState } from "react";
import { App, Button, Empty, Input, Pagination } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { usePageMeta } from "../../hooks/usePageMeta";
import MoyouLoading from "../../components/MoyouLoading";
import PractiseImageLightbox from "../CopybookPractise/components/PractiseImageLightbox";
import { getDictionaryCharacters } from "../../services/dictionary/api";
import {
    fetchMoedictEntryAny,
    type MoedictEntry,
} from "../../services/dictionary/moedict";
import { getCharVariants } from "../../services/dictionary/variant";
import MoeDictExplanation from "./components/MoeDictExplanation";
import DictionaryCharacterCard from "./components/DictionaryCharacterCard";

/** 每页条数（与后端字典接口默认值一致） */
const PAGE_SIZE = 12;

/**
 * MinIO 临时访问地址静默刷新间隔（毫秒）
 *
 * 预签名 URL 有效期默认 10 分钟，与临帖页一致，
 * 过期前静默重查当前条件，保持图片可访问。
 */
const URL_REFRESH_INTERVAL = 8 * 60 * 1000;

/** 字体筛选项（value 传给后端按 copybook.style 模糊匹配，"" = 全部） */
const STYLE_OPTIONS = [
    { label: "全部字体", value: "" },
    { label: "楷书", value: "楷书" },
    { label: "行书", value: "行书" },
    { label: "草书", value: "草书" },
    { label: "隶书", value: "隶书" },
    { label: "篆书", value: "篆书" },
    { label: "行楷", value: "行楷" },
];

/** 单个汉字校验（CJK 统一表意文字基本区） */
const SINGLE_CHAR_RE = /^[\u4e00-\u9fff]$/;

/** 释义区状态 */
type ExplanationState = "idle" | "loading" | "ready" | "notFound" | "error";

/**
 * 书法字典（公共前台页）
 *
 * 上：萌典汉字释义（独立请求，失败不影响下方作品区）；
 * 下：墨友数据库已裁切书法单字，跨碑帖检索 + 字体筛选 + 分页，
 * 点击卡片复用临帖页全屏大图查看器预览。
 */
const Dictionary = () => {
    const { message } = App.useApp();

    // 页面标题（本页暂不纳入浏览历史 pageType 枚举，不上报）
    usePageMeta({ title: "书法字典", record: false });

    // ==================== 搜索与筛选状态 ====================
    /** 输入框内容（未提交） */
    const [inputValue, setInputValue] = useState("");

    /** 已提交查询的汉字（真正驱动数据请求） */
    const [queryChar, setQueryChar] = useState("");

    /** 当前字体筛选（"" = 全部） */
    const [style, setStyle] = useState("");

    /** 当前页码（从 1 开始） */
    const [pageNum, setPageNum] = useState(1);

    // ==================== 书法作品列表状态 ====================
    const [records, setRecords] = useState<API.WebDictionaryCharacter[]>([]);
    const [total, setTotal] = useState(0);
    const [listLoading, setListLoading] = useState(false);
    /** 接口请求失败（与「查询成功但无结果」严格区分） */
    const [listError, setListError] = useState(false);

    // ==================== 释义状态 ====================
    const [explanationState, setExplanationState] =
        useState<ExplanationState>("idle");
    const [explanation, setExplanation] = useState<MoedictEntry | null>(null);

    // ==================== 大图预览状态 ====================
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);
    const [previewLoadedSrc, setPreviewLoadedSrc] = useState<string | null>(
        null
    );
    const [previewErrorSrc, setPreviewErrorSrc] = useState<string | null>(
        null
    );

    // ==================== 引用（竞态处理 / 定时刷新读取最新值） ====================
    /** 列表请求序号：只接受最新一次请求的结果，防止旧响应覆盖新查询 */
    const requestIdRef = useRef(0);

    /** 释义请求序号，同样用于竞态保护 */
    const explainSeqRef = useRef(0);

    /** 查询提交序号：变体转换为异步，防止旧提交晚于新提交生效 */
    const searchSeqRef = useRef(0);

    /** 当前生效的查询条件（定时静默刷新与失败重试读取；含简繁变体候选） */
    const queryParamsRef = useRef({
        queryChar: "",
        variants: [] as string[],
        style: "",
        pageNum: 1,
    });

    // ==================== 数据加载 ====================

    /**
     * 加载书法作品分页数据
     *
     * 由搜索 / 切换字体 / 翻页 / 重试等事件直接调用（不在 effect 中同步触发），
     * 查询条件显式传参，避免闭包旧值。
     *
     * @param params 本次查询条件
     * @param silent 静默刷新（预签名地址续期），不显示 loading
     */
    const loadList = async (
        params: {
            queryChar: string;
            variants: string[];
            style: string;
            pageNum: number;
        },
        silent = false
    ) => {
        if (!params.queryChar) return;

        const requestId = ++requestIdRef.current;

        if (!silent) {
            setListLoading(true);
            setListError(false);
        }

        try {
            const res = await getDictionaryCharacters({
                character: params.queryChar,
                // 简繁变体串（含输入字本身），后端 IN 匹配两种收录形态
                variants:
                    params.variants.length > 1
                        ? params.variants.join("")
                        : undefined,
                style: params.style || undefined,
                pageNum: params.pageNum,
                pageSize: PAGE_SIZE,
            });

            // 旧请求晚于新请求返回时直接丢弃
            if (requestId !== requestIdRef.current) return;

            if (res.code === 200 && res.data) {
                setRecords(res.data.records || []);
                setTotal(res.data.total || 0);
                setListError(false);
            } else if (!silent) {
                setListError(true);
                message.error(res.message || "查询失败，请稍后重试");
            }
        } catch {
            if (requestId !== requestIdRef.current) return;
            if (!silent) {
                setListError(true);
            }
        } finally {
            if (!silent && requestId === requestIdRef.current) {
                setListLoading(false);
            }
        }
    };

    /**
     * 拉取萌典释义（与作品请求相互独立，互不阻塞）
     *
     * 按简繁候选字依次尝试（萌典以繁体字头收录，
     * 简体输入需带繁体候选才能命中）；
     * 全部候选 404 → 暂无释义；其余异常 → 释义暂不可用（不影响作品区）。
     */
    const loadExplanation = (candidates: string[]) => {
        const seq = ++explainSeqRef.current;

        setExplanationState("loading");

        fetchMoedictEntryAny(candidates)
            .then((entry) => {
                if (seq !== explainSeqRef.current) return;

                if (entry) {
                    setExplanation(entry);
                    setExplanationState("ready");
                } else {
                    setExplanation(null);
                    setExplanationState("notFound");
                }
            })
            .catch(() => {
                if (seq !== explainSeqRef.current) return;
                setExplanationState("error");
            });
    };

    // 预签名地址定时静默续期（回调异步触发，不违反 effect 同步 setState 限制）
    useEffect(() => {
        if (!queryChar) return;

        const timer = setInterval(() => {
            loadList(queryParamsRef.current, true);
        }, URL_REFRESH_INTERVAL);

        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryChar]);

    // ==================== 交互 ====================

    /** 提交查询：仅允许单个汉字 */
    const handleSearch = async (raw: string) => {
        const value = raw.trim();

        if (!value) {
            message.warning("请输入要查询的汉字");
            return;
        }

        if (value.length > 1) {
            message.warning("书法字典一次只能查询一个汉字，例如「永」");
            return;
        }

        if (!SINGLE_CHAR_RE.test(value)) {
            message.warning("请输入一个汉字（不含字母、数字或符号）");
            return;
        }

        const seq = ++searchSeqRef.current;

        // 变体转换（首次还需下载词典 chunk）耗时先进入加载态，避免“点了没反应”
        setListLoading(true);
        setExplanationState("loading");

        // 简繁变体候选：释义按候选字头依次查询（萌典以繁体收录），
        // 图片按候选字集合匹配（字库简繁两种收录形态都能命中）
        const variants = await getCharVariants(value);

        // 等待转换期间已提交过更新的查询，本次作废
        if (seq !== searchSeqRef.current) return;

        const nextParams = {
            queryChar: value,
            variants,
            style,
            pageNum: 1,
        };

        queryParamsRef.current = nextParams;
        setQueryChar(value);
        setPageNum(1);

        loadList(nextParams);
        loadExplanation(variants);
    };

    /** 切换字体：重置到第一页并重新查询 */
    const handleStyleChange = (value: string) => {
        if (value === style) return;

        const nextParams = {
            ...queryParamsRef.current,
            style: value,
            pageNum: 1,
        };

        queryParamsRef.current = nextParams;
        setStyle(value);
        setPageNum(1);

        if (nextParams.queryChar) {
            loadList(nextParams);
        }
    };

    const handlePageChange = (page: number) => {
        const nextParams = {
            ...queryParamsRef.current,
            pageNum: page,
        };

        queryParamsRef.current = nextParams;
        setPageNum(page);

        loadList(nextParams);
    };

    /** 打开大图预览 */
    const handlePreview = (index: number) => {
        setPreviewIndex(index);
    };

    // ==================== 派生：预览状态 ====================
    const previewItem =
        previewIndex != null ? records[previewIndex] : undefined;

    const previewSrc = previewItem?.imageUrl;

    const previewLoading =
        !!previewSrc &&
        previewLoadedSrc !== previewSrc &&
        previewErrorSrc !== previewSrc;

    const totalPages = Math.ceil(total / PAGE_SIZE);

    // ==================== 渲染 ====================
    return (
        <div className="min-h-screen bg-[#FAF6ED] font-serif text-gray-800 select-none">
            <main className="max-w-310 mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
                {/* ---------- 页头 ---------- */}
                <div className="text-center mt-6">
                    <h1 className="text-3xl md:text-4xl font-bold text-[#3F332A] tracking-[0.2em]">
                        书法字典
                    </h1>
                    <p className="mt-2.5 text-sm text-[#756B61] tracking-[0.15em]">
                        探寻汉字本义，品鉴历代书法
                    </p>
                </div>

                {/* ---------- 搜索与字体筛选 ---------- */}
                <div className="mt-8 flex justify-center">
                    <div className="w-full max-w-xl flex gap-2">
                        <Input
                            size="large"
                            allowClear
                            maxLength={8}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onPressEnter={(e) =>
                                handleSearch(
                                    (e.target as HTMLInputElement).value
                                )
                            }
                            placeholder="输入一个汉字，如：永"
                            prefix={
                                <SearchOutlined className="text-[#964328]/50" />
                            }
                            className="flex-1"
                        />
                        <Button
                            type="primary"
                            size="large"
                            loading={listLoading}
                            onClick={() => handleSearch(inputValue)}
                        >
                            查询
                        </Button>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {STYLE_OPTIONS.map((option) => {
                        const isActive = style === option.value;

                        return (
                            <button
                                key={option.label}
                                type="button"
                                onClick={() =>
                                    handleStyleChange(option.value)
                                }
                                className={`px-4 py-1.5 rounded-full text-sm border cursor-pointer transition-colors ${
                                    isActive
                                        ? "bg-[#964328] text-[#FFF8ED] border-transparent font-bold"
                                        : "bg-white/70 text-[#756B61] border-[#964328]/20 hover:text-[#964328] hover:border-[#964328]/45"
                                }`}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>

                {/* ---------- 汉字释义区（查询后展示） ---------- */}
                {queryChar && (
                    <div className="mt-7">
                        <MoeDictExplanation
                            char={queryChar}
                            state={
                                explanationState === "idle"
                                    ? "loading"
                                    : explanationState
                            }
                            entry={explanation}
                        />
                    </div>
                )}

                {/* ---------- 书法作品区 ---------- */}
                <section className="mt-8">
                    <h2 className="text-lg font-bold text-[#3F332A] flex items-baseline gap-2">
                        书法作品集萃
                        {queryChar && total > 0 && (
                            <span className="text-xs font-normal text-[#B8AFA4]">
                                共 {total} 例 · 「{queryChar}」
                                {style ? ` · ${style}` : ""}
                            </span>
                        )}
                    </h2>

                    <div className="mt-4">
                        {!queryChar ? (
                            <div className="py-16">
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="在上方输入一个汉字，探索它在历代法书中的模样"
                                />
                            </div>
                        ) : listLoading ? (
                            <div className="h-96">
                                <MoyouLoading tip="正在检索书法作品……" />
                            </div>
                        ) : listError ? (
                            <div className="py-14 text-center space-y-3">
                                <p className="text-sm text-[#964328]">
                                    书法作品查询失败，请检查网络后重试
                                </p>
                                <Button
                                    onClick={() =>
                                        loadList(queryParamsRef.current)
                                    }
                                >
                                    重新查询
                                </Button>
                            </div>
                        ) : records.length === 0 ? (
                            <div className="py-16">
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={
                                        style
                                            ? `未找到「${queryChar}」的${style}作品，试试切换其他字体`
                                            : `墨友字库暂无「${queryChar}」的裁切单字，敬请期待收录`
                                    }
                                />
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                                    {records.map((item, index) => (
                                        <DictionaryCharacterCard
                                            key={item.characterId}
                                            item={item}
                                            onPreview={() =>
                                                handlePreview(index)
                                            }
                                        />
                                    ))}
                                </div>

                                {totalPages > 1 && (
                                    <div className="mt-6 flex justify-center">
                                        <Pagination
                                            className="theme-pagination"
                                            current={pageNum}
                                            total={total}
                                            pageSize={PAGE_SIZE}
                                            showSizeChanger={false}
                                            onChange={handlePageChange}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </section>
            </main>

            {/* ---------- 大图预览（复用临帖页全屏查看器，仅展示书法单字图片） ---------- */}
            {previewIndex != null && previewItem && (
                <PractiseImageLightbox
                    total={records.length}
                    index={previewIndex}
                    onIndexChange={setPreviewIndex}
                    onClose={() => setPreviewIndex(null)}
                    heading={`书法字典 · ${queryChar}`}
                    label={`${
                        previewItem.characterText || "单字"
                    } · ${previewIndex + 1}/${records.length}${
                        previewItem.style ? ` · ${previewItem.style}` : ""
                    }`}
                    loading={previewLoading}
                    error={
                        previewSrc
                            ? null
                            : "该单字图片地址已失效，请关闭后重新查询"
                    }
                >
                    {previewSrc && (
                        <img
                            key={previewSrc}
                            src={previewSrc}
                            alt={`${previewItem.characterText || "单字"}书法作品`}
                            draggable={false}
                            className="max-h-full max-w-full object-contain rounded shadow-2xl pointer-events-auto"
                            onLoad={() => setPreviewLoadedSrc(previewSrc)}
                            onError={() => setPreviewErrorSrc(previewSrc)}
                        />
                    )}
                </PractiseImageLightbox>
            )}
        </div>
    );
};

export default Dictionary;
