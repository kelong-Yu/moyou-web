import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { App, Empty, Input, Pagination, Tooltip } from "antd";
import {
    HeartFilled,
    HeartOutlined,
    DownloadOutlined,
    FileImageOutlined,
    SearchOutlined,
    RightOutlined,
    ZoomInOutlined
} from "@ant-design/icons";
import { Hand } from "lucide-react";
import {
    getPractiseInit,
    getPractiseCharacters,
    getPractisePageFullImageUrl,
    getHotCopybooks,
    getCharacterFavoriteStatus,
    favoriteCharacter,
    unfavoriteCharacter,
} from "../../services/copybook/api";
import { useSelector } from "react-redux";
import type { RootState } from "../../stores";
import MoyouLoading from "../../components/MoyouLoading";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useHandWavePager } from "../../hooks/useHandWavePager";
import PractiseToolbox from "./components/PractiseToolbox";
import PractiseImageLightbox from "./components/PractiseImageLightbox";
import GesturePagerPanel from "./components/GesturePagerPanel";
import GesturePrivacyNotice from "./components/GesturePrivacyNotice";
import CharacterFavoriteCard from "../UserProfile/components/CharacterFavoriteCard";

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

    // 页面标题 + 浏览历史：取得真实碑帖名称后才设置并上报
    usePageMeta({
        title: init?.copybookName ? `${init.copybookName} · 单字临帖` : "",
        pageType: "practise",
        targetId: copybookId,
        ready: !!init?.copybookName,
    });

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

    /**
     * 全屏大图查看器（当前页内打开，不新开窗口、不跳转路由）
     *
     * 两种模式互斥、内容彼此独立：
     * - page      ：只浏览碑帖原文件各页 MinIO 高清大图
     * - character ：只浏览裁切单字卡片
     */
    const [lightbox, setLightbox] = useState<
        | { mode: "page"; index: number }
        | { mode: "character"; index: number }
        | null
    >(null);

    /** 查看器中已加载完成的高清大图地址（按地址派生加载态，无需 effect） */
    const [lightboxLoadedSrc, setLightboxLoadedSrc] = useState<string | null>(
        null
    );

    /** 查看器中加载失败的高清大图地址 */
    const [lightboxErrorSrc, setLightboxErrorSrc] = useState<string | null>(
        null
    );


    /** 临帖工具箱：功能暂时占位 */
    const handleToolPlaceholder = (toolName: string) => {
        message.info(`${toolName}功能正在开发中，敬请期待`);
    };

    /** 临帖工具箱点击分发：释文对照 / 手势翻页为真实开关，其余工具占位 */
    const handleToolClick = (toolName: string) => {
        if (toolName === "释文对照") {
            setShowTranscription((prev) => !prev);
            return;
        }

        if (toolName === "手势翻页") {
            toggleGesturePager();
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

    /** 当前登录用户（单字收藏需要登录） */
    const userInfo = useSelector((state: RootState) => state.user.userInfo);

    /** 当前选中单字是否已收藏（服务端真实状态） */
    const [characterFavorited, setCharacterFavorited] = useState(false);

    /** 收藏请求进行中，防止重复提交 */
    const [favoriteSubmitting, setFavoriteSubmitting] = useState(false);

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

    /**
     * 缩略图条是否处于加载中：
     * 初始化数据未返回，或存在尚未加载完成的预览图。
     * 图片本身始终挂载，Loading 以覆盖层形式展示。
     */
    const stripLoading =
        initLoading ||
        pagePreviews.some((preview) => {
            const src = preview.thumbnailUrl || preview.url;
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

    // 选中单字变化时查询该单字的真实收藏状态（游客返回 false）
    useEffect(() => {
        const characterId = selectedCharacter?.id;

        if (characterId == null) {
            setCharacterFavorited(false);
            return;
        }

        let cancelled = false;

        getCharacterFavoriteStatus(characterId)
            .then((res: any) => {
                if (cancelled) return;
                if (res.code === 200) {
                    setCharacterFavorited(!!res.data);
                }
            })
            .catch(() => {
                // 状态查询失败不阻塞页面，保持未收藏态
            });

        return () => {
            cancelled = true;
        };
    }, [selectedCharacter?.id]);

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

    // ==================== 全屏大图查看器 ====================
    /** 查看器当前条目（page 模式为分页预览，character 模式为单字记录） */
    const lightboxPreview =
        lightbox?.mode === "page" ? pagePreviews[lightbox.index] : undefined;

    const lightboxCharacter =
        lightbox?.mode === "character"
            ? characterRecords[lightbox.index]
            : undefined;

    /** page 模式当前页码（接口与展示均以后端页码为准） */
    const lightboxPageNumber =
        lightbox?.mode === "page"
            ? lightboxPreview?.pageNumber ?? lightbox.index + 1
            : undefined;

    /** 碑帖原文件高清大图后端接口地址（MinIO 原文件，非压缩缩略图） */
    const lightboxFullSrc =
        lightbox?.mode === "page" && copybookId && lightboxPageNumber
            ? getPractisePageFullImageUrl(copybookId, lightboxPageNumber)
            : undefined;

    /**
     * 高清大图是否加载中 / 加载失败：
     * 纯派生（当前地址既未加载成功也未失败即视为加载中），
     * 切换页码时地址变化自动回到加载态，无需 effect 重置。
     */
    const lightboxImageLoading =
        lightbox?.mode === "page" &&
        !!lightboxFullSrc &&
        lightboxLoadedSrc !== lightboxFullSrc &&
        lightboxErrorSrc !== lightboxFullSrc;

    const lightboxImageFailed =
        lightbox?.mode === "page" &&
        !!lightboxFullSrc &&
        lightboxErrorSrc === lightboxFullSrc;

    /**
     * 预加载相邻图片（上一张 / 下一张），
     * 减少查看器内切换时的等待。
     */
    useEffect(() => {
        if (!lightbox || !copybookId) return;

        const preload = (url?: string) => {
            if (!url) return;
            const image = new Image();
            image.src = url;
        };

        if (lightbox.mode === "page") {
            [lightbox.index - 1, lightbox.index + 1].forEach((i) => {
                const preview = pagePreviews[i];
                if (!preview) return;
                preload(
                    getPractisePageFullImageUrl(
                        copybookId,
                        preview.pageNumber ?? i + 1
                    )
                );
            });
        } else {
            [lightbox.index - 1, lightbox.index + 1].forEach((i) => {
                preload(characterRecords[i]?.imageUrl);
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lightbox?.mode, lightbox?.index, copybookId]);

    /** 点击碑帖分页缩略图：打开原文件高清大图查看器 */
    const handleOpenPageLightbox = (index: number) => {
        setLightbox({ mode: "page", index });
    };

    /** 点击单字大图区域：打开单字卡片查看器（定位到当前选中单字） */
    const handleOpenCharacterLightbox = () => {
        if (!selectedCharacter?.imageUrl) return;

        const index = characterRecords.findIndex(
            (item) => item.id === selectedCharacter.id
        );

        setLightbox({ mode: "character", index: Math.max(0, index) });
    };

    const handleCloseLightbox = () => {
        setLightbox(null);

        // 手势翻页绑定大图查看器：关闭查看器时一并停止摄像头识别
        if (gestureOn) {
            handWavePager.stop();
            setGestureOn(false);
        }
    };

    /** 查看器切换上一张 / 下一张；单字模式同步更新页面选中单字 */
    const handleLightboxIndexChange = (nextIndex: number) => {
        if (!lightbox) return;

        setLightbox({ ...lightbox, index: nextIndex });

        if (lightbox.mode === "character") {
            const next = characterRecords[nextIndex];
            if (next) {
                setSelectedCharacter(next);
            }
        }
    };

    /** 中间列表翻页 */
    const handleMiddlePageChange = (page: number) => {
        setMiddlePage(page);
        loadCharacters(page, searchKeyword);
    };

    // ==================== 手势翻页（摄像头上下挥腕） ====================
    // 手势功能绑定全屏大图查看器：
    // 开启时先进入大图查看器（未打开则默认打开单字卡片查看器），
    // 再弹隐私提示，确认后才申请摄像头权限，挥腕切换查看器的"上一张 / 下一张"。

    /** 手势翻页开关（工具箱"手势翻页"与左侧工具栏手势按钮共用） */
    const [gestureOn, setGestureOn] = useState(false);

    /** 查看器当前序列总数（page 模式 = 碑帖页数，character 模式 = 当前页单字数） */
    const lightboxTotal = lightbox
        ? lightbox.mode === "page"
            ? pagePreviews.length
            : characterRecords.length
        : 0;

    /**
     * 挥腕 → 上一张 / 下一张：
     * 直接复用查看器的 handleLightboxIndexChange，不重新实现切换逻辑：
     * - 向下挥腕 = 下一张，向上挥腕 = 上一张；
     * - 第一张 / 最后一张继续挥动被忽略，不会产生越界序号；
     * - 切换后选中单字、页面预览等状态仍按原有逻辑更新；
     * - 查看器按钮与键盘翻页不受影响。
     */
    const handleGestureNext = () => {
        if (!lightbox || lightbox.index >= lightboxTotal - 1) return;
        handleLightboxIndexChange(lightbox.index + 1);
    };

    const handleGesturePrev = () => {
        if (!lightbox || lightbox.index <= 0) return;
        handleLightboxIndexChange(lightbox.index - 1);
    };

    const handWavePager = useHandWavePager({
        onSwipeUp: handleGesturePrev,
        onSwipeDown: handleGestureNext,
    });

    /** 隐私提示弹窗：确认后才真正申请摄像头并开启识别 */
    const [privacyOpen, setPrivacyOpen] = useState(false);

    /**
     * 点击「隔空翻页」：只做前置校验并弹隐私提示，不动查看器
     *
     * 查看器必须等用户确认后再打开——先开查看器会让 Modal（z-index 1000）
     * 被查看器遮罩（z-[9999]）压住，用户看不到提示却已经进了大图。
     * 停止：关闭摄像头识别，查看器保持打开。
     */
    const toggleGesturePager = () => {
        if (gestureOn) {
            handWavePager.stop();
            setGestureOn(false);
            return;
        }

        // 手势翻页只作用于大图查看器，先确认有内容可看
        if (
            !lightbox &&
            !selectedCharacter?.imageUrl &&
            pagePreviews.length === 0
        ) {
            message.warning("当前碑帖暂无可查看的大图内容");
            return;
        }

        setPrivacyOpen(true);
    };

    /**
     * 隐私提示里点「开启」：先进大图查看器，再启动摄像头识别
     *
     * 默认打开单字卡片查看器并定位当前选中单字，无单字时回退碑帖原页查看器；
     * 已在查看器中（从查看器内再次开启）则保持当前序列不动。
     */
    const confirmGesturePager = () => {
        setPrivacyOpen(false);

        if (!lightbox) {
            if (selectedCharacter?.imageUrl) {
                handleOpenCharacterLightbox();
            } else if (pagePreviews.length > 0) {
                handleOpenPageLightbox(0);
            } else {
                // 提示停留期间数据被重置：不启动识别，也不开空的查看器
                message.warning("当前碑帖暂无可查看的大图内容");
                return;
            }
        }

        setGestureOn(true);
        void handWavePager.start();
    };

    /** 面板右上角关闭：停止摄像头识别，查看器保持原样 */
    const closeGesturePager = () => {
        handWavePager.stop();
        setGestureOn(false);
    };

    /** 收藏 / 取消收藏当前单字（真实接口，成功后以服务端状态为准） */
    const handleFavorite = () => {
        const character = selectedCharacter;
        if (!character) return;

        if (!userInfo) {
            message.info("请先登录");
            navigate("/login");
            return;
        }
        if (favoriteSubmitting) return;

        setFavoriteSubmitting(true);

        (
            characterFavorited
                ? unfavoriteCharacter(character.id)
                : favoriteCharacter(character.id)
        )
            .then((res: any) => {
                if (res.code === 200) {
                    setCharacterFavorited(!characterFavorited);
                    message.success(
                        characterFavorited ? "已取消收藏" : "收藏成功"
                    );
                } else if (res.code === 4001) {
                    message.info("请先登录");
                    navigate("/login");
                } else {
                    message.error(res.message || "操作失败，请稍后重试");
                }
            })
            .catch(() => {
                message.error("操作失败，请稍后重试");
            })
            .finally(() => {
                setFavoriteSubmitting(false);
            });
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

    /** 手势翻页按钮开关见 toggleGesturePager（与工具箱"手势翻页"共用） */

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
                                const src = preview.thumbnailUrl || preview.url;

                                return (
                                    <button
                                        type="button"
                                        key={preview.thumbnailUrl || preview.url || index}
                                        onClick={() => handleOpenPageLightbox(index)}
                                        className="group relative block h-full shrink-0 border-0 bg-transparent p-0 cursor-zoom-in"
                                        title={`第 ${preview.pageNumber ?? index + 1} 页 · 点击查看高清大图`}
                                    >
                                        {src ? (
                                            <img
                                                src={src}
                                                alt={`第 ${preview.pageNumber ?? index + 1} 页`}
                                                draggable={false}
                                                className="block h-full w-auto max-w-none object-contain rounded transition-transform duration-300 ease-out group-hover:scale-110"
                                                onLoad={() => markThumbLoaded(src)}
                                                onError={(e) => {
                                                    // 加载失败同样计入进度，避免 Loading 卡住
                                                    markThumbLoaded(src);
                                                    (e.target as HTMLImageElement).style.visibility =
                                                        "hidden";
                                                }}
                                            />
                                        ) : (
                                            <div className="h-full w-16 bg-[#F5EBDD] rounded" />
                                        )}
                                        <span className="absolute bottom-0 right-0 px-1 text-[10px] leading-4 bg-black/45 text-white rounded-tl">
                                            {preview.pageNumber ?? index + 1}
                                        </span>
                                    </button>
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
                    <div className="flex-1 min-w-0 flex gap-3 lg:h-95">
                        {/* 竖向操作图标栏 */}
                        <div className="w-11 shrink-0 rounded-xl border border-[#964328]/15 bg-white/75 shadow-sm flex flex-col items-center gap-2 py-2.5 px-1 self-start">
                            <Tooltip
                                title={characterFavorited ? "取消收藏" : "收藏单字"}
                                placement="right"
                            >
                                <button
                                    type="button"
                                    onClick={handleFavorite}
                                    disabled={!selectedCharacter || favoriteSubmitting}
                                    className={`w-8 h-8 rounded-lg border flex items-center justify-center text-base cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-0 ${
                                        characterFavorited
                                            ? "text-[#964328] bg-[#964328]/10"
                                            : "text-[#756B61] hover:text-[#964328] hover:bg-[#964328]/5"
                                    }`}
                                >
                                    {characterFavorited ? (
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

                            <Tooltip
                                title={
                                    gestureOn
                                        ? "停止手势翻页"
                                        : "隔空翻页"
                                }
                                placement="right"
                            >
                                <button
                                    type="button"
                                    onClick={toggleGesturePager}
                                    className={`w-8 h-8 rounded-lg border-0 flex items-center justify-center text-base cursor-pointer transition-colors ${
                                        gestureOn
                                            ? "text-[#964328] bg-[#964328]/10"
                                            : "text-[#756B61] hover:text-[#964328] hover:bg-[#964328]/5"
                                    }`}
                                >
                                    <Hand size={17}/>
                                </button>
                            </Tooltip>
                        </div>

                        {/* 单字大图（正方形区域，高度与右侧单字列表区域等高）
                            点击打开全屏单字卡片查看器，悬浮图片轻微放大 */}
                        <div
                            onClick={handleOpenCharacterLightbox}
                            className={`group flex-1 min-w-0 rounded-xl border border-[#964328]/15 bg-white/75 shadow-sm flex items-center justify-center overflow-hidden transition-shadow ${
                                selectedCharacter?.imageUrl
                                    ? "cursor-zoom-in hover:ring-2 hover:ring-[#964328]/35"
                                    : ""
                            }`}
                        >
                            <div className="relative aspect-square w-full max-w-full lg:w-auto lg:h-[calc(100%-16px)] my-2">
                                {selectedCharacter?.imageUrl ? (
                                    <>
                                        <img
                                            src={selectedCharacter.imageUrl}
                                            alt={
                                                selectedCharacter.characterText ||
                                                "单字"
                                            }
                                            draggable={false}
                                            className={`w-full h-full object-contain transition-[opacity,transform] duration-300 ease-out group-hover:scale-105 ${
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

                                        {/* 悬浮提示：点击查看大图 */}
                                        <span className="absolute bottom-2 right-2 z-20 flex items-center gap-1 px-2 py-0.5 text-xs bg-[#1A1815]/75 text-amber-100 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <ZoomInOutlined />
                                            查看大图
                                        </span>
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
                                    className="theme-pagination"
                                    current={middlePage}
                                    total={characterTotal}
                                    pageSize={PAGE_SIZE}
                                    showSizeChanger={false}
                                    onChange={handleMiddlePageChange}
                                />
                            </div>
                        )}
                    </div>

                    {/* ---------- 右侧：临帖工具箱 + 碑帖热搜 ---------- */}
<div className="w-full lg:w-70 shrink-0 self-start flex flex-col gap-3">

    {/* 临帖工具箱（独立组件） */}
    <PractiseToolbox
        onToolClick={handleToolClick}
        activeTool={
            gestureOn
                ? "手势翻页"
                : showTranscription
                  ? "释文对照"
                  : undefined
        }
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

            {/* ==================== 手势翻页状态面板（只在大图查看器内出现） ==================== */}
            {gestureOn && lightbox && (
                <GesturePagerPanel
                    videoRef={handWavePager.videoRef}
                    status={handWavePager.status}
                    errorMessage={handWavePager.errorMessage}
                    lastSwipe={handWavePager.lastSwipe}
                    onStop={closeGesturePager}
                />
            )}

            {/* ==================== 进入手势翻页前的隐私提示 ==================== */}
            <GesturePrivacyNotice
                open={privacyOpen}
                onCancel={() => setPrivacyOpen(false)}
                onConfirm={confirmGesturePager}
            />

            {/* ==================== 全屏大图查看器 ==================== */}
            {/* 当前页内打开（不新开浏览器窗口、不跳转路由），
                page 模式只展示碑帖原文件高清大图，
                character 模式只展示裁切单字卡片，两种模式内容互不混排 */}
            {lightbox && (
                <PractiseImageLightbox
                    total={
                        lightbox.mode === "page"
                            ? pagePreviews.length
                            : characterRecords.length
                    }
                    index={lightbox.index}
                    onIndexChange={handleLightboxIndexChange}
                    onClose={handleCloseLightbox}
                    heading={
                        lightbox.mode === "page"
                            ? init?.copybookName
                                ? `《${init.copybookName}》原帖`
                                : "碑帖原帖"
                            : init?.copybookName
                              ? `《${init.copybookName}》单字`
                              : "碑帖单字"
                    }
                    label={
                        lightbox.mode === "page"
                            ? `第 ${lightboxPageNumber ?? lightbox.index + 1} 页 · ${lightbox.index + 1}/${pagePreviews.length}`
                            : lightboxCharacter?.characterText
                              ? `${lightboxCharacter.characterText} · ${lightbox.index + 1}/${characterRecords.length}`
                              : `${lightbox.index + 1}/${characterRecords.length}`
                    }
                    loading={lightboxImageLoading}
                    error={
                        lightboxImageFailed
                            ? "高清大图加载失败，请稍后重试"
                            : null
                    }
                >
                    {lightbox.mode === "page" ? (
                        lightboxFullSrc && (
                            <img
                                key={lightboxFullSrc}
                                src={lightboxFullSrc}
                                alt={`第 ${lightboxPageNumber ?? lightbox.index + 1} 页高清大图`}
                                draggable={false}
                                className="max-h-full max-w-full object-contain rounded shadow-2xl pointer-events-auto"
                                onLoad={() =>
                                    setLightboxLoadedSrc(lightboxFullSrc)
                                }
                                onError={() =>
                                    setLightboxErrorSrc(lightboxFullSrc)
                                }
                            />
                        )
                    ) : lightboxCharacter ? (
                        // 单字卡片：完全复用 CharacterFavoriteCard 结构样式，
                        // 点击不跳转，缩放变换作用于整张卡片；
                        // pointer-events-auto 在缩放层禁用指针后恢复卡片自身交互
                        <div className="pointer-events-auto">
                            <CharacterFavoriteCard
                                item={{
                                    characterId: lightboxCharacter.id,
                                    characterText:
                                        lightboxCharacter.characterText,
                                    imageUrl:
                                        lightboxCharacter.imageUrl,
                                    copybookId,
                                    copybookName: init?.copybookName,
                                    calligrapherName:
                                        init?.calligrapherName,
                                    dynastyName: init?.dynastyName,
                                    style: init?.style,
                                }}
                                onClick={() => undefined}
                                sizeClassName="w-80 h-120"
                            />
                        </div>
                    ) : null}
                </PractiseImageLightbox>
            )}
        </div>
    );
};

export default CopybookPractise;