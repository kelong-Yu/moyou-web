import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { App, Empty, Input, Pagination, Tooltip } from "antd";
import {
    HeartFilled,
    HeartOutlined,
    DownloadOutlined,
    EyeOutlined,
    FileImageOutlined,
    SearchOutlined,
    RightOutlined
} from "@ant-design/icons";
import {
    getPractiseInit,
    getPractiseCharacters,
    getHotCopybooks,
} from "../../services/copybook/api";
import MoyouLoading from "../../components/MoyouLoading";
import PractiseToolbox from "./components/PractiseToolbox";

/**
 * 田字格图标
 *
 * antd 图标库没有现成的田字格图标，
 * 按需求使用带田字格边框的图形替代：
 * 外框实线 + 内部十字虚线。
 */
const TianGeIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
    >
        <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
        <path d="M12 3.5v17M3.5 12h17" strokeDasharray="3 2.4" />
    </svg>
);

/** 中间单字列表每页数量（3 行 x 4 列，与后端分页查询配合） */
const PAGE_SIZE = 12;

/**
 * 临时访问地址自动刷新间隔（毫秒）
 *
 * MinIO 预签名 URL 有效期默认 10 分钟，
 * 这里在过期前静默刷新一次数据。
 */
const URL_REFRESH_INTERVAL = 8 * 60 * 1000;

const CopybookPractise = () => {
    const { id } = useParams<{ id: string }>();
    const { message } = App.useApp();
    const navigate = useNavigate();

    const copybookId = id && !Number.isNaN(Number(id)) ? Number(id) : null;

    // ==================== 数据状态 ====================
    /** 页面初始化数据（碑帖/书法家/原始文件/分页预览，图片均为后端生成的临时地址） */
    const [initLoading, setInitLoading] = useState(true);
    const [init, setInit] = useState<API.WebPractiseInitResponse>();

    /**
     * 返回碑帖详情页
     * 1. 如果当前页面由其他窗口打开，则关闭当前窗口，回到原窗口
     * 2. 如果是直接打开的页面，则跳转到当前碑帖详情页
     */
    const handleReturn = () => {
        if (window.opener && !window.opener.closed) {
            window.close();
        } else {
            navigate(`/copybook/${copybookId}`);
        }
    };

    /** 当前页单字记录（服务端分页结果） */
    const [charactersLoading, setCharactersLoading] = useState(true);
    const [characterRecords, setCharacterRecords] = useState<
        API.WebPractiseCharacter[]
    >([]);
    const [characterTotal, setCharacterTotal] = useState(0);

    /** 右侧热搜列表（当前热度来源为碑帖浏览量倒序） */
    const [hotList, setHotList] = useState<API.WebCopybookHotResponse[]>([]);
    const [hotLoading, setHotLoading] = useState(true);

    // ==================== 交互状态 ====================
    /** 当前选中的单字（保存完整对象，跨页切换时左侧大图不丢） */
    const [selectedCharacter, setSelectedCharacter] =
        useState<API.WebPractiseCharacter>();


    /** 临帖工具箱：功能暂时占位 */
    const handleToolPlaceholder = (toolName: string) => {
        message.info(`${toolName}功能正在开发中，敬请期待`);
    };

    /** 临帖工具箱点击分发：释文对照为真实开关，其余工具占位 */
    const handleToolClick = (toolName: string) => {
        if (toolName === "释文对照") {
            setShowTranscription((prev) => !prev);
            return;
        }

        handleToolPlaceholder(toolName);
    };
    // ==================== 图片加载状态（配合 MoyouLoading） ====================
    /**
     * 已加载完成的原帖预览缩略图地址集合
     *
     * 以地址为键持续累积（onLoad / onError 均计入），
     * 不随数据刷新重置，避免已缓存的图片重复等待。
     */
    const [loadedThumbSrcs, setLoadedThumbSrcs] = useState<Set<string>>(
        () => new Set()
    );

    /** 最近一次加载完成的大图地址 */
    const [loadedBigImageSrc, setLoadedBigImageSrc] = useState<string>();

    /** 搜索框输入值 / 已生效的关键词 */
    const [searchInput, setSearchInput] = useState("");
    const [searchKeyword, setSearchKeyword] = useState("");

    /** 中间单字列表当前页（从 1 开始） */
    const [middlePage, setMiddlePage] = useState(1);

    /** 田字格显示开关 */
    const [showTianGrid, setShowTianGrid] = useState(false);

    /** 释文对照展开开关（默认关闭，点击工具箱"释文对照"切换） */
    const [showTranscription, setShowTranscription] = useState(false);

    /** 单字收藏（本地演示状态，后端暂无单字收藏接口） */
    const [localFavorites, setLocalFavorites] = useState<number[]>([]);

    // ==================== 引用（供定时刷新读取最新值） ====================
    const middlePageRef = useRef(middlePage);
    const searchKeywordRef = useRef(searchKeyword);

    middlePageRef.current = middlePage;
    searchKeywordRef.current = searchKeyword;

    // ==================== 数据加载 ====================

    /**
     * 加载单字分页数据
     *
     * @param pageNum       页码
     * @param keyword       汉字关键词
     * @param selectFirst   加载后是否将选中单字重置为当前页第一条
     * @param silent        静默刷新（不显示 loading，用于临时地址续期）
     */
    const loadCharacters = async (
        pageNum: number,
        keyword: string,
        options?: { selectFirst?: boolean; silent?: boolean }
    ) => {
        if (!copybookId) return;

        const { selectFirst, silent } = options || {};

        if (!silent) {
            setCharactersLoading(true);
        }

        try {
            const res = await getPractiseCharacters(copybookId, {
                pageNum,
                pageSize: PAGE_SIZE,
                keyword: keyword || undefined,
            });

            if (res.code === 200 && res.data) {
                const records = res.data.records || [];

                setCharacterRecords(records);
                setCharacterTotal(res.data.total || 0);

                setSelectedCharacter((prev) => {
                    // 明确要求重置选中（首次加载 / 新搜索）
                    if (selectFirst) {
                        return records[0];
                    }

                    // 当前选中单字仍在返回数据中：刷新其临时访问地址
                    if (prev) {
                        const fresh = records.find(
                            (item) => item.id === prev.id
                        );
                        return fresh ?? prev;
                    }

                    // 尚无选中：默认选中第一条
                    return records[0];
                });
            }
        } finally {
            if (!silent) {
                setCharactersLoading(false);
            }
        }
    };

    // 初始化：页面数据 + 第一页单字 + 热搜
    useEffect(() => {
        if (!copybookId) {
            setInitLoading(false);
            setCharactersLoading(false);
            return;
        }

        let cancelled = false;

        // 临帖页初始化数据（含分页预览图临时地址）
        getPractiseInit(copybookId)
            .then((res) => {
                if (!cancelled && res.code === 200) {
                    setInit(res.data);
                }
            })
            .finally(() => {
                if (!cancelled) setInitLoading(false);
            });

        // 已裁剪单字第一页
        loadCharacters(1, "", { selectFirst: true });

        // 碑帖热搜前十
        getHotCopybooks(10)
            .then((res) => {
                if (!cancelled && res.code === 200) {
                    setHotList(res.data || []);
                }
            })
            .finally(() => {
                if (!cancelled) setHotLoading(false);
            });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [copybookId]);

    /**
     * 临时访问地址定时刷新
     *
     * MinIO 预签名 URL 默认 10 分钟过期，
     * 定时静默重新拉取当前页数据与初始化数据，
     * 保持选中单字与翻页、搜索状态不变。
     */
    useEffect(() => {
        if (!copybookId) return;

        const timer = setInterval(() => {
            getPractiseInit(copybookId)
                .then((res) => {
                    if (res.code === 200) {
                        setInit(res.data);
                    }
                })
                .catch(() => {
                    // 静默刷新失败不提示，等下一轮
                });

            loadCharacters(middlePageRef.current, searchKeywordRef.current, {
                silent: true,
            });
        }, URL_REFRESH_INTERVAL);

        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [copybookId]);

    // ==================== 派生数据 ====================
    const pagePreviews = useMemo(
        () => init?.pagePreviews || [],
        [init]
    );

    const totalMiddlePages = Math.max(
        1,
        Math.ceil(characterTotal / PAGE_SIZE)
    );

    /**
     * 缩略图条是否处于加载中：
     * 初始化数据未返回，或存在尚未加载完成的预览图。
     * 图片本身始终挂载，Loading 以覆盖层形式展示。
     */
    const stripLoading =
        initLoading ||
        pagePreviews.some((preview) => {
            const src = preview.thumbnailUrl
                ? `/api${preview.thumbnailUrl}`
                : preview.url;
            return src != null && !loadedThumbSrcs.has(src);
        });

    /**
     * 左侧单字大图是否处于加载中：
     * 已有选中单字且其图片尚未加载完成。
     * 翻页 / 搜索时保留已加载的旧大图，不做遮挡；
     * 切回看过的单字时地址已在集合中，立即显示不重复等待。
     */
    const bigImageLoading =
        selectedCharacter?.imageUrl != null &&
        loadedBigImageSrc !== selectedCharacter.imageUrl;

    /** 标记一张预览缩略图加载完成（onLoad / onError 共用） */
    const markThumbLoaded = (src: string) => {
        setLoadedThumbSrcs((prev) => {
            if (prev.has(src)) return prev;
            const next = new Set(prev);
            next.add(src);
            return next;
        });
    };

    // ==================== 交互处理 ====================

    /** 搜索单字：不跳转、不刷新，仅更新中间列表 */
    const handleSearch = (value: string) => {
        const keyword = value.trim();

        // 空内容禁止搜索
        if (!keyword) {
            message.warning("请输入搜索单字");
            return;
        }

        setSearchKeyword(keyword);
        setMiddlePage(1);
        loadCharacters(1, keyword, { selectFirst: true });
    };

    /** 点击单字缩略图：左侧大图同步切换 */
    const handleSelectCharacter = (character: API.WebPractiseCharacter) => {
        setSelectedCharacter(character);
    };

    /** 中间列表翻页 */
    const handleMiddlePageChange = (page: number) => {
        setMiddlePage(page);
        loadCharacters(page, searchKeyword);
    };

    /** 收藏当前单字（占位：后端暂无单字收藏接口，仅本地演示） */
    const handleFavorite = () => {
        const character = selectedCharacter;
        if (!character) return;

        const favorited = localFavorites.includes(character.id);
        setLocalFavorites((prev) =>
            favorited
                ? prev.filter((cid) => cid !== character.id)
                : [...prev, character.id]
        );
        message.info(
            favorited
                ? "已取消收藏（单字收藏服务端接口暂未开放，当前为本地演示）"
                : "收藏成功（单字收藏服务端接口暂未开放，当前为本地演示）"
        );
    };

    /** 田字格显示开关 */
    const handleToggleTianGrid = () => {
        setShowTianGrid((prev) => !prev);
    };

    /** 下载当前单字图片 */
    const handleDownload = async () => {
        const character = selectedCharacter;
        if (!character?.imageUrl) return;

        const url = character.imageUrl;
        const fileName = `${init?.copybookName ?? "碑帖"}-${
            character.characterText || character.id
        }.png`;

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("fetch failed");
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = objectUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(objectUrl);

            message.success("单字图片下载成功");
        } catch {
            // MinIO 跨域等原因无法 Blob 下载时，退化为新窗口打开图片
            window.open(url, "_blank");
        }
    };

    /** 眼睛图标占位：眼控翻页后续开发 */
    const handleEyePlaceholder = () => {
        message.info("眼控翻页功能开发中，敬请期待");
    };

    // ==================== 渲染 ====================

    if (!copybookId) {
        return (
            <div className="min-h-screen bg-[#FAF6ED] font-serif pt-32 text-center">
                <Empty description="碑帖参数有误" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAF6ED] font-serif text-gray-800 pb-12 select-none">
            <main className="max-w-310 mx-auto px-4 sm:px-6 lg:px-8 pt-22">
                {/* ==================== 书法家与碑帖简介栏 ==================== */}
                <div className="min-h-14">
                    {initLoading ? (
                        // 初始化数据未返回：保持占位高度，加载状态由下方缩略图条展示
                        null
                    ) : init ? (
                        <div className="flex items-start gap-3 py-1.5">
                            {init.calligrapherAvatar ? (
                                <img
                                    src={init.calligrapherAvatar}
                                    alt={init.calligrapherName}
                                    className="h-10 w-10 shrink-0 rounded-full object-cover border border-[#964328]/30 shadow-xs"
                                />
                            ) : (
                                <div className="h-10 w-10 shrink-0 rounded-full bg-[#F5EBDD] border border-[#964328]/20 flex items-center justify-center text-[#964328] text-base font-bold">
                                    {(init.calligrapherName || "佚名").slice(0, 1)}
                                </div>
                            )}

                            <div className="min-w-0 flex-1">
                                {/* 书法家姓名 - 碑帖名称 */}
                                <div className="flex items-center gap-1.5 text-base font-bold">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (init.calligrapherId) {
                                                navigate(`/aritcleWorks/${init.calligrapherId}`);
                                            }
                                        }}
                                        className="text-[#3F332A] hover:text-[#964328] transition-colors cursor-pointer bg-transparent border-0 p-0 font-serif font-bold"
                                    >
                                        {init.calligrapherName || "佚名"}
                                    </button>

                                    <span className="text-[#964328]">-</span>

                                    <span className="text-[#964328]">
                                        {init.copybookName}
                                    </span>
                                </div>

                                {/* 简短描述 + 返回上一页：两端对齐，右边缘与下方缩略图条对齐 */}
                                <div className="flex items-start justify-between gap-4">
                                    {init.shortDescription && (
                                        <p className="mt-1 text-xs text-[#756B61] line-clamp-1 min-w-0 flex-1">
                                            {init.shortDescription}
                                        </p>
                                    )}

                                    <button
                                        onClick={handleReturn}
                                        className="shrink-0 text-sm font-bold text-[#964328] hover:text-[#6c250d] flex items-center gap-1 cursor-pointer transition-colors group pt-0.5"
                                    >
                                        <span >返回上一页</span>
                                        <RightOutlined className="text-[10px] mr-2 group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                </div>
                                
                            </div>
                        </div>
                    ) : (
                        <span className="text-sm text-[#756B61]">
                            碑帖信息加载失败或不存在
                        </span>
                    )}
                </div>

                {/* ==================== 碑帖文件分页缩略图区域 ==================== */}
                <div className="relative mt-3 h-30 rounded-lg border border-[#964328]/15 bg-white/70 shadow-sm overflow-x-auto overflow-y-hidden">
                    {!initLoading && pagePreviews.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 gap-2">
                            <FileImageOutlined />
                            <span>暂无原帖页面预览</span>
                        </div>
                    ) : (
                        <div className="w-max max-w-full h-full mx-auto flex items-center gap-3 px-3 py-2.5">
                            {pagePreviews.map((preview, index) => {
                                const src = preview.thumbnailUrl
                                    ? `/api${preview.thumbnailUrl}`
                                    : preview.url;

                                return (
                                    <div
                                        key={preview.thumbnailUrl || preview.url || index}
                                        className="relative h-full shrink-0 rounded overflow-hidden"
                                        title={`第 ${preview.pageNumber ?? index + 1} 页`}
                                    >
                                        {src ? (
                                            <img
                                                src={src}
                                                alt={`第 ${preview.pageNumber ?? index + 1} 页`}
                                                className="block h-full w-auto max-w-none object-contain"
                                                onLoad={() => markThumbLoaded(src)}
                                                onError={(e) => {
                                                    // 加载失败同样计入进度，避免 Loading 卡住
                                                    markThumbLoaded(src);
                                                    (e.target as HTMLImageElement).style.visibility =
                                                        "hidden";
                                                }}
                                            />
                                        ) : (
                                            <div className="h-full w-16 bg-[#F5EBDD]" />
                                        )}
                                        <span className="absolute bottom-0 right-0 px-1 text-[10px] leading-4 bg-black/45 text-white rounded-tl">
                                            {preview.pageNumber ?? index + 1}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* 加载覆盖层：图片保持挂载，Loading 叠加在其上，onLoad 后移除 */}
                    {stripLoading && (
                        <div className="absolute inset-0 z-10">
                            <MoyouLoading tip="正在加载原帖预览……" />
                        </div>
                    )}
                </div>

                {/* ==================== 释文对照（默认收起，工具箱"释文对照"切换） ==================== */}
                {/* 内容块宽度随释文内容填充并整体居中，最大不超过缩略图条宽度；超出隐藏 */}
                {/* 淡入淡出：常驻挂载 + max-height/opacity 过渡（条件卸载无法做退出动画） */}
                <div
                    className={`overflow-hidden bg-transparent transition-all duration-500 ease-in-out ${
                        showTranscription
                            ? "max-h-40 opacity-100 mt-3"
                            : "max-h-0 opacity-0 mt-0"
                    }`}
                >
                    <div className="h-40 overflow-hidden flex justify-center">
                        {init?.transcription ? (
                            <div className="relative h-full max-w-full border-l-2 border-[#964328]">
                                <p className="h-full w-fit max-w-full pr-5 pl-2 text-lg leading-10 font-serif text-gray-700 [writing-mode:vertical-rl]">
                                    {init.transcription}
                                </p>

                                {/* 引首章：长方形朱印"墨友"，盖在开头一两个字上 */}
                                <span
                                    aria-hidden="true"
                                    className="absolute top-1.5 right-0.5 flex flex-col items-center justify-center border-2 border-[#964328] rounded-[3px] px-1 py-1 -rotate-6 opacity-85 mix-blend-multiply select-none pointer-events-none"
                                >
                                    <span className="text-[13px] leading-4 font-bold font-serif text-[#964328]">
                                        墨
                                    </span>
                                    <span className="text-[13px] leading-4 font-bold font-serif text-[#964328]">
                                        友
                                    </span>
                                </span>
                            </div>
                        ) : (
                            <p className="h-full w-full flex items-center justify-center text-sm text-gray-400">
                                暂无释文
                            </p>
                        )}
                    </div>
                </div>

                {/* ==================== 单字搜索框 ==================== */}
                <div className="mt-4 flex justify-center">
                    <Input
                        size="large"
                        allowClear
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onPressEnter={(e) =>
                            handleSearch((e.target as HTMLInputElement).value)
                        }
                        placeholder="输入汉字，搜索当前碑帖已裁剪的单字"
                        prefix={<SearchOutlined className="text-[#964328]/50" />}
                        className="w-full max-w-2xl"
                        suffix={
                            <button
                                type="button"
                                onClick={() => handleSearch(searchInput)}
                                className="px-4 py-1 rounded-full bg-[#964328] text-[#FFF8ED] text-sm cursor-pointer hover:bg-[#7e3720] transition-colors border-0"
                            >
                                搜索
                            </button>
                        }
                    />
                </div>

                {/* ==================== 下层三栏主体区域 ==================== */}
                <div className="mt-4 flex flex-col lg:flex-row gap-5 lg:items-start">
                    {/* ---------- 左侧：当前选中单字大图 + 竖向操作栏 ---------- */}
                    <div className="flex-1 min-w-0 flex gap-3 lg:h-[380px]">
                        {/* 竖向操作图标栏 */}
                        <div className="w-11 shrink-0 rounded-xl border border-[#964328]/15 bg-white/75 shadow-sm flex flex-col items-center gap-2 py-2.5 px-1 self-start">
                            <Tooltip title="收藏单字" placement="right">
                                <button
                                    type="button"
                                    onClick={handleFavorite}
                                    disabled={!selectedCharacter}
                                    className={`w-8 h-8 rounded-lg border flex items-center justify-center text-base cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-0 ${
                                        selectedCharacter &&
                                        localFavorites.includes(selectedCharacter.id)
                                            ? "text-[#964328] bg-[#964328]/10"
                                            : "text-[#756B61] hover:text-[#964328] hover:bg-[#964328]/5"
                                    }`}
                                >
                                    {selectedCharacter &&
                                    localFavorites.includes(selectedCharacter.id) ? (
                                        <HeartFilled />
                                    ) : (
                                        <HeartOutlined />
                                    )}
                                </button>
                            </Tooltip>

                            <Tooltip title={showTianGrid ? "隐藏田字格" : "显示田字格"} placement="right">
                                <button
                                    type="button"
                                    onClick={handleToggleTianGrid}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors border-0 ${
                                        showTianGrid
                                            ? "text-[#964328] bg-[#964328]/10"
                                            : "text-[#756B61] hover:text-[#964328] hover:bg-[#964328]/5"
                                    }`}
                                >
                                    <TianGeIcon className="w-4.5 h-4.5" />
                                </button>
                            </Tooltip>

                            <Tooltip title="下载单字图片" placement="right">
                                <button
                                    type="button"
                                    onClick={handleDownload}
                                    disabled={!selectedCharacter?.imageUrl}
                                    className="w-8 h-8 rounded-lg border-0 flex items-center justify-center text-base text-[#756B61] hover:text-[#964328] hover:bg-[#964328]/5 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <DownloadOutlined />
                                </button>
                            </Tooltip>

                            <Tooltip title="眼控翻页（开发中）" placement="right">
                                <button
                                    type="button"
                                    onClick={handleEyePlaceholder}
                                    className="w-8 h-8 rounded-lg border-0 flex items-center justify-center text-base text-[#756B61] hover:text-[#964328] hover:bg-[#964328]/5 cursor-pointer transition-colors"
                                >
                                    <EyeOutlined />
                                </button>
                            </Tooltip>
                        </div>

                        {/* 单字大图（正方形区域，高度与右侧单字列表区域等高） */}
                        <div className="flex-1 min-w-0 rounded-xl border border-[#964328]/15 bg-white/75 shadow-sm flex items-center justify-center overflow-hidden">
                            <div className="relative aspect-square w-full max-w-full lg:w-auto lg:h-[calc(100%-16px)] my-2">
                                {selectedCharacter?.imageUrl ? (
                                    <>
                                        <img
                                            src={selectedCharacter.imageUrl}
                                            alt={
                                                selectedCharacter.characterText ||
                                                "单字"
                                            }
                                            className={`w-full h-full object-contain transition-opacity ${
                                                bigImageLoading ? "opacity-0" : "opacity-100"
                                            }`}
                                            onLoad={() =>
                                                setLoadedBigImageSrc(
                                                    selectedCharacter.imageUrl
                                                )
                                            }
                                            onError={(e) => {
                                                // 加载失败同样结束 Loading，避免卡住
                                                setLoadedBigImageSrc(
                                                    selectedCharacter.imageUrl
                                                );
                                                (
                                                    e.target as HTMLImageElement
                                                ).style.opacity = "0";
                                            }}
                                        />

                                        {/* 田字格叠加层 */}
                                        {showTianGrid && !bigImageLoading && (
                                            <div className="absolute inset-0 pointer-events-none">
                                                <div className="absolute inset-0 border-2 border-[#964328]/70" />
                                                <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-[#964328]/50" />
                                                <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-[#964328]/50" />
                                            </div>
                                        )}

                                        {/* 当前单字标注 */}
                                        {!bigImageLoading && (
                                            <span className="absolute top-2 left-2 px-2 py-0.5 text-xs bg-[#1A1815]/75 text-amber-100 rounded">
                                                {selectedCharacter.characterText ||
                                                    `单字 #${selectedCharacter.id}`}
                                                {selectedCharacter.pageNumber
                                                    ? ` · 第${selectedCharacter.pageNumber}页`
                                                    : ""}
                                            </span>
                                        )}
                                    </>
                                ) : charactersLoading ? (
                                    // 初次加载，尚无选中单字
                                    <MoyouLoading tip="正在加载单字……" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Empty
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            description="暂无已裁剪的单字"
                                        />
                                    </div>
                                )}

                                {/* 加载覆盖层：图片保持挂载（透明），onLoad 后移除覆盖层 */}
                                {bigImageLoading && (
                                    <div className="absolute inset-0 z-10">
                                        <MoyouLoading tip="正在加载单字……" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ---------- 中间：已裁剪单字列表展示及下方独立分页 ---------- */}
                    <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex-1 min-h-0 overflow-y-auto lg:h-[512px]">
                            {charactersLoading ? (
                                // 搜索 / 翻页时仅此列表区域进入加载态，不遮挡左右两侧
                                <MoyouLoading tip="正在加载单字……" />
                            ) : characterRecords.length === 0 ? (
                                <div className="h-full flex items-center justify-center">
                                    <Empty
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        description={
                                            searchKeyword
                                                ? `未找到“${searchKeyword}”对应的单字`
                                                : "当前碑帖暂无已裁剪单字"
                                        }
                                    />
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 gap-2 content-start">
                                    {characterRecords.map((character) => {
                                        const isSelected =
                                            selectedCharacter?.id === character.id;

                                        return (
                                            <div
                                                key={character.id}
                                                onClick={() =>
                                                    handleSelectCharacter(character)
                                                }
                                                className={`rounded-lg overflow-hidden bg-white cursor-pointer border transition-all ${
                                                    isSelected
                                                        ? "border-[#964328] ring-1 ring-[#964328]/40 shadow-sm"
                                                        : "border-[#964328]/15 hover:border-[#964328]/45"
                                                }`}
                                            >
                                                <div className="aspect-square bg-[#FAF6ED] flex items-center justify-center p-1">
                                                    <img
                                                        src={character.imageUrl}
                                                        alt={
                                                            character.characterText ||
                                                            "单字"
                                                        }
                                                        loading="lazy"
                                                        className="max-w-full max-h-full object-contain"
                                                        onError={(e) => {
                                                            (
                                                                e.target as HTMLImageElement
                                                            ).style.visibility =
                                                                "hidden";
                                                        }}
                                                    />
                                                </div>
                                                <div className="text-center text-[11px] leading-5 text-[#756B61] border-t border-[#964328]/10 truncate px-1">
                                                    {character.characterText || "未识别"}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* 分页：移至单字列表下方，独立居中显示 */}
                        {/* 搜索 / 翻页加载期间保持可见，避免布局跳动 */}
                        {characterTotal > 0 && (
                            <div className="shrink-0 pt-3 pb-1 flex justify-center items-center">
                                <Pagination
                                    current={middlePage}
                                    total={characterTotal}
                                    pageSize={PAGE_SIZE}
                                    onChange={handleMiddlePageChange}
                                />
                                <span className="ml-4 text-sm text-gray-500">
                                    第 {middlePage} 页 / 共 {totalMiddlePages} 页
                                </span>
                            </div>
                        )}
                    </div>

                    {/* ---------- 右侧：临帖工具箱 + 碑帖热搜 ---------- */}
<div className="w-full lg:w-70 shrink-0 self-start flex flex-col gap-3">

    {/* 临帖工具箱（独立组件） */}
    <PractiseToolbox
        onToolClick={handleToolClick}
        activeTool={showTranscription ? "释文对照" : undefined}
    />

    {/* 碑帖热搜 */}
    <div className="w-full rounded-xl border border-[#964328]/15 bg-white/70 shadow-sm p-4">
        <h3 className="text-base font-bold text-[#3F332A] mb-3">
            碑帖热搜
        </h3>

        {hotLoading ? (
            <MoyouLoading
                className="moyou-loading--compact"
                tip="正在加载热搜……"
            />
        ) : hotList.length === 0 ? (
            <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无热搜数据"
            />
        ) : (
            <ul className="space-y-1">
                {hotList.slice(0, 10).map((item, index) => (
                    <li
                        key={item.id}
                        onClick={() =>
                            navigate(`/copybook/${item.id}`)
                        }
                        className="group flex items-center gap-2 py-1.5 px-1.5 rounded-md cursor-pointer hover:bg-[#964328]/5 transition-colors"
                    >
                        <span
                            className={`w-5 text-center text-sm font-bold shrink-0 ${
                                index < 3
                                    ? "text-[#964328]"
                                    : "text-[#B8AFA4]"
                            }`}
                        >
                            {index + 1}
                        </span>

                        <span className="flex-1 min-w-0 text-sm truncate text-[#3F332A] group-hover:text-[#964328] transition-colors">
                            《{item.name}》
                            <span className="text-xs text-[#8B8178] ml-1">
                                {item.calligrapherName}
                            </span>
                        </span>

                        {/* 热度图标暂时预留 */}
                        <span className="w-5 shrink-0" />
                    </li>
                ))}
            </ul>
        )}
    </div>
</div>
                </div>
            </main>
        </div>
    );
};

export default CopybookPractise;