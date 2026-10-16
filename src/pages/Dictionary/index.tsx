import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { App, Button, Empty, Input, Pagination } from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { Hand, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../stores";
import { usePageMeta } from "../../hooks/usePageMeta";
import MoyouLoading from "../../components/MoyouLoading";
import PractiseImageLightbox from "../CopybookPractise/components/PractiseImageLightbox";
import GesturePagerPanel from "../CopybookPractise/components/GesturePagerPanel";
import GesturePrivacyNotice from "../CopybookPractise/components/GesturePrivacyNotice";
import { useHandWavePager } from "../../hooks/useHandWavePager";
import {
    getDictionaryCharacters,
    getDictionaryShowcase,
} from "../../services/dictionary/api";
import {
    getHotCopybookCards,
    favoriteCharacter,
    getCharacterFavoriteStatus,
    unfavoriteCharacter,
} from "../../services/copybook/api";
import { getRandomDiscourse } from "../../services/calligraphyDiscourse/api";
import heroBg from "../../assets/lantingxu.jpg";
import "./index.css";
import {
    fetchMoedictEntryAny,
    type MoedictEntry,
} from "../../services/dictionary/moedict";
import { getCharVariants } from "../../services/dictionary/variant";
import MoeDictExplanation from "./components/MoeDictExplanation";
import HotCopybookCard from "./components/HotCopybookCard";
import CharacterFavoriteCard from "../UserProfile/components/CharacterFavoriteCard";

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
];

/** 单个汉字校验（CJK 统一表意文字基本区） */
const SINGLE_CHAR_RE = /^[\u4e00-\u9fff]$/;

/**
 * 字环每张字卡的固定倾斜角（下标对应环上位置）
 *
 * 参考弧形散卡布局：字面保持正立的同时带小幅手卷散落感。
 */
const RING_TILTS = [
    "-8deg",
    "5deg",
    "-4deg",
    "7deg",
    "-6deg",
    "4deg",
    "-7deg",
    "6deg",
    "-3deg",
];

/** 字环每张字卡的固定缩放（制造远近层次） */
const RING_SCALES = [
    "1",
    "0.92",
    "1.06",
    "0.95",
    "1.02",
    "0.9",
    "1.05",
    "0.94",
    "1",
];

/** 内环（半径小、顺时针）字卡数量 */
const RING_INNER_COUNT = 6;

/** 外环（半径大、逆时针圆弧）字卡数量 */
const RING_OUTER_COUNT = 12;

/** 单字日荐每次展示数量 */
const DAILY_CHAR_COUNT = 4;

/** 热搜碑帖每次展示数量 */
const HOT_CARD_COUNT = 4;

/** 热搜碑帖一次取回的热搜池大小（换一批在池内轮换，覆盖 3 批） */
const HOT_POOL_SIZE = 12;

/** 释义区状态 */
type ExplanationState = "idle" | "loading" | "ready" | "notFound" | "error";

const CN_DIGITS = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

/** 1 ~ 31 的中文数字（用于月、日） */
const toChineseNumber = (value: number) => {
    if (value < 10) return CN_DIGITS[value];
    if (value === 10) return "十";
    if (value < 20) return `十${CN_DIGITS[value % 10]}`;

    const ones = value % 10;
    return `${CN_DIGITS[Math.floor(value / 10)]}十${ones ? CN_DIGITS[ones] : ""}`;
};

/** 公历日期转中文数字，用作书论卡片最左列的落款 */
const toChineseDate = (date: Date) => {
    const year = String(date.getFullYear())
        .split("")
        .map((digit) => CN_DIGITS[Number(digit)])
        .join("");

    return `${year}年${toChineseNumber(date.getMonth() + 1)}月${toChineseNumber(
        date.getDate()
    )}日`;
};

/** 书名号在后台录入时可填可不填，这里统一补全 */
const withBookMarks = (value: string) =>
    /^[《〈]/.test(value) ? value : `《${value}》`;

/**
 * 分段弧轨的虚线参数
 *
 * 字卡位于 rotate(i·step) translateY(R) 处，即 SVG 角度（顺时针、y 向下）
 * 90° + i·(360/N)；要让每段短弧落在相邻两卡正中，
 * 首段起点即 90° 再让开半个「间隙 - 段长」。
 * viewBox 固定 200×200、r=100，靠 CSS 缩放到真实半径。
 */
const arcDash = (count: number) => {
    const circumference = 2 * Math.PI * 100;
    const gap = circumference / Math.max(count, 1);
    const segment = gap * 0.5;
    const start = (circumference * 90) / 360 + (gap - segment) / 2;

    return {
        dasharray: `${segment} ${circumference - segment}`,
        dashoffset: -start,
    };
};

/**
 * 区块标题：左侧标题 + 说明，右侧换一批 / 换一换，两端对齐
 */
const SectionTitle = ({
    title,
    hint,
    actionText,
    loading,
    onAction,
}: {
    title: string;
    hint?: string;
    actionText: string;
    loading: boolean;
    onAction: () => void;
}) => (
    <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#3F332A] flex items-center gap-2">
            {title}
            {hint && (
                <span className="text-xs font-normal text-[#B8AFA4]">
                    {hint}
                </span>
            )}
        </h2>
        <button
            type="button"
            onClick={onAction}
            disabled={loading}
            className="flex shrink-0 items-center gap-1 text-xs text-[#964328] hover:text-[#B85C47] disabled:opacity-50 cursor-pointer transition-colors"
        >
            <ReloadOutlined spin={loading} />
            {actionText}
        </button>
    </div>
);

/** 查看器顶部工具按钮（与大图查看器自带按钮同尺寸） */
const viewerToolButton =
    "h-9 w-9 rounded-full border-0 flex items-center justify-center " +
    "bg-white/10 text-amber-50 text-sm cursor-pointer " +
    "hover:bg-white/25 transition-colors";

/**
 * 书法字典（公共前台页）
 *
 * 页头：兰亭序底图 + 暗色遮罩 + 双旋转字环 + 搜索栏；
 * 未搜索时依次展示「热搜碑帖 / 单字日荐 / 每日书论」，每块 4 条可换一批；
 * 搜索后改为字体筛选 + 释义卡 + 单字列表的上下布局。
 * 单字大图查看器内可收藏当前单字、开启隔空挥腕翻页。
 */
const Dictionary = () => {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const userInfo = useSelector((state: RootState) => state.user.userInfo);

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

    // ==================== 页头字环状态 ====================
    /** 旋转字环的裁切单字（接口失败 / 字库为空时为隐藏字环） */
    const [showcase, setShowcase] = useState<API.WebDictionaryCharacter[]>([]);

    // ==================== 单字日荐状态 ====================
    /** 首屏即在加载，故初始为 true：effect 内只发静默请求，不同步 setState */
    const [dailyChars, setDailyChars] = useState<API.WebDictionaryCharacter[]>(
        []
    );
    const [dailyLoading, setDailyLoading] = useState(true);

    // ==================== 热搜碑帖状态 ====================
    /** 热搜池（浏览量倒序），换一批只在池内轮换，不重复请求 */
    const [hotPool, setHotPool] = useState<API.WebCopybookResponse[]>([]);
    const [hotBatch, setHotBatch] = useState(0);
    const [hotLoading, setHotLoading] = useState(true);

    // ==================== 每日书论状态 ====================
    const [discourse, setDiscourse] =
        useState<API.CalligraphyDiscourse | null>(null);
    const [discourseLoading, setDiscourseLoading] = useState(true);

    // ==================== 大图查看器状态 ====================
    /** 当前列表（搜索结果 / 单字日荐）中的预览下标 */
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);

    /** 已收藏的单字 ID（仅登录用户会写入） */
    const [favoritedId, setFavoritedId] = useState<number | null>(null);
    const [favoriteSubmitting, setFavoriteSubmitting] = useState(false);

    // ==================== 查看器内手势翻页状态 ====================
    const [gestureOn, setGestureOn] = useState(false);
    const [gesturePrivacyOpen, setGesturePrivacyOpen] = useState(false);

    // ==================== 引用（竞态处理 / 定时刷新读取最新值） ====================
    /** 列表请求序号：只接受最新一次请求的结果，防止旧响应覆盖新查询 */
    const requestIdRef = useRef(0);

    /** 释义请求序号，同样用于竞态保护 */
    const explainSeqRef = useRef(0);

    /** 查询提交序号：变体转换为异步，防止旧提交晚于新提交生效 */
    const searchSeqRef = useRef(0);

    /** 单字日荐请求序号 */
    const dailySeqRef = useRef(0);

    /** 热搜碑帖请求序号 */
    const hotSeqRef = useRef(0);

    /** 书论请求序号 */
    const discourseSeqRef = useRef(0);

    /** 书论竖排横向滚动容器（超长书论需定位到右端起读） */
    const discourseScrollRef = useRef<HTMLDivElement | null>(null);

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

    /**
     * 单字日荐：后端每次从热门碑帖随机取样，换一批即重新请求
     *
     * 写成 Promise 链（与页头字环一致）而非 async/await，
     * 是为了让 setState 全部落在回调里，首屏可以直接在 effect 中调用。
     * 加载态只由点击处理器与首屏初始值置起，这里只负责收尾清除。
     */
    const loadDailyChars = () => {
        const seq = ++dailySeqRef.current;

        getDictionaryShowcase(DAILY_CHAR_COUNT)
            .then((res) => {
                if (seq !== dailySeqRef.current) return;

                if (res.code === 200 && Array.isArray(res.data)) {
                    setDailyChars(res.data.filter((item) => !!item.imageUrl));
                }
            })
            .catch(() => {
                // 静默失败：保留当前展示，不影响其他区块
            })
            .finally(() => {
                if (seq === dailySeqRef.current) setDailyLoading(false);
            });
    };

    /**
     * 热搜碑帖：按浏览量倒序取回热搜池，换一批在池内轮换
     */
    const loadHotPool = () => {
        const seq = ++hotSeqRef.current;

        getHotCopybookCards(HOT_POOL_SIZE)
            .then((res) => {
                if (seq !== hotSeqRef.current) return;

                if (res.code === 200 && Array.isArray(res.data)) {
                    setHotPool(res.data);
                }
            })
            .catch(() => {
                // 静默失败：保留当前热搜池
            })
            .finally(() => {
                if (seq === hotSeqRef.current) setHotLoading(false);
            });
    };

    /**
     * 每日书论：随机取一条
     *
     * @param excludeId 换一换时排除当前这条，避免点了没变化
     */
    const loadDiscourse = (excludeId?: number) => {
        const seq = ++discourseSeqRef.current;

        getRandomDiscourse(excludeId)
            .then((res) => {
                if (seq !== discourseSeqRef.current) return;

                // data 为空表示库中只有被排除的这一条，保持当前展示
                if (res.code === 200 && res.data) {
                    setDiscourse(res.data);
                }
            })
            .catch(() => {
                if (seq === discourseSeqRef.current) {
                    message.error("书论加载失败，请稍后重试");
                }
            })
            .finally(() => {
                if (seq === discourseSeqRef.current) {
                    setDiscourseLoading(false);
                }
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

    // 页头字环：进入页面加载一次，并按预签名有效期静默续期；
    // 失败静默处理（隐藏 / 保留旧字环），不影响搜索主流程
    useEffect(() => {
        let alive = true;

        const loadShowcase = () => {
            getDictionaryShowcase(RING_INNER_COUNT + RING_OUTER_COUNT)
                .then((res) => {
                    if (!alive) return;

                    if (res.code === 200 && Array.isArray(res.data)) {
                        setShowcase(res.data.filter((item) => !!item.imageUrl));
                    }
                })
                .catch(() => {
                    // 静默失败：首屏无字环，续期失败保留旧字环
                });
        };

        loadShowcase();

        const timer = setInterval(loadShowcase, URL_REFRESH_INTERVAL);

        return () => {
            alive = false;
            clearInterval(timer);
        };
    }, []);

    // 浏览态三块内容：进入页面各拉取一次（加载态取自初始值，
    // effect 内不同步 setState），图片按预签名有效期静默续期
    useEffect(() => {
        loadDailyChars();
        loadHotPool();
        loadDiscourse();

        const timer = setInterval(() => {
            loadDailyChars();
            loadHotPool();
        }, URL_REFRESH_INTERVAL);

        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 竖排书论自右向左阅读：书论换行后版框向右变宽，切篇时把滚动位定到最右端，
    // 保证首列（书名）可见，超长正文向左逐列滚动
    useEffect(() => {
        const el = discourseScrollRef.current;

        if (el) {
            el.scrollLeft = el.scrollWidth - el.clientWidth;
        }
    }, [discourse]);

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
        setPreviewIndex(null);

        loadList(nextParams);
        loadExplanation(variants);
    };

    /**
     * 输入框变化：清空时回到浏览态首屏
     * （隐藏释义区与字体筛选，恢复三块推荐内容）
     */
    const handleInputChange = (value: string) => {
        setInputValue(value);

        if (value.trim()) return;

        // 作废在途的列表 / 释义 / 变体请求
        requestIdRef.current++;
        searchSeqRef.current++;
        explainSeqRef.current++;

        queryParamsRef.current = {
            queryChar: "",
            variants: [],
            style,
            pageNum: 1,
        };

        setQueryChar("");
        setRecords([]);
        setTotal(0);
        setPageNum(1);
        setListLoading(false);
        setListError(false);
        setExplanation(null);
        setExplanationState("idle");
        setPreviewIndex(null);
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

    /** 单字日荐换一批：重新请求一批（后端每次重新随机取样） */
    const handleDailyRefresh = () => {
        setDailyLoading(true);
        loadDailyChars();
    };

    /** 热搜碑帖换一批：池内轮换下一批；池子不足一批时重新拉取 */
    const handleHotRefresh = () => {
        if (hotPool.length <= HOT_CARD_COUNT) {
            setHotLoading(true);
            loadHotPool();
            return;
        }

        setHotBatch((batch) => batch + 1);
    };

    /** 每日书论换一换：排除当前这条再随机取一条 */
    const handleDiscourseRefresh = () => {
        setDiscourseLoading(true);
        loadDiscourse(discourse?.id);
    };

    /** 打开大图预览 */
    const handlePreview = (index: number) => {
        setPreviewIndex(index);
    };

    // ==================== 派生：双环 / 列表 / 预览状态 ====================
    /** 内环（半径小、顺时针）字卡 */
    const ringInner = showcase.slice(0, RING_INNER_COUNT);

    /** 外环（半径大、逆时针圆弧）字卡 */
    const ringOuter = showcase.slice(
        RING_INNER_COUNT,
        RING_INNER_COUNT + RING_OUTER_COUNT
    );

    /** 热搜碑帖当前批次（池内首尾相接轮换，取不满时自动回绕到池头） */
    const hotVisible = useMemo(() => {
        if (hotPool.length === 0) return [];

        const size = Math.min(HOT_CARD_COUNT, hotPool.length);
        const start = (hotBatch * size) % hotPool.length;

        return Array.from({ length: size }, (_, index) =>
            hotPool[(start + index) % hotPool.length]
        );
    }, [hotPool, hotBatch]);

    /** 当前列表：搜索时展示搜索结果，否则展示单字日荐 */
    const currentList = queryChar ? records : dailyChars;

    const previewItem =
        previewIndex != null ? currentList[previewIndex] : undefined;

    const totalPages = Math.ceil(total / PAGE_SIZE);

    /** 当前查看的单字是否已收藏（未登录时恒为 false，不读历史值） */
    const isFavorited =
        !!userInfo &&
        previewItem != null &&
        favoritedId === previewItem.characterId;

    // ==================== 查看器：收藏 ====================

    // 切换查看的单字时同步服务端收藏状态（游客不查，避免无意义请求）
    useEffect(() => {
        const characterId = previewItem?.characterId;

        if (!characterId || !userInfo) return undefined;

        let alive = true;

        getCharacterFavoriteStatus(characterId)
            .then((res) => {
                if (alive && res.code === 200) {
                    setFavoritedId(res.data ? characterId : null);
                }
            })
            .catch(() => {
                // 静默失败：保持当前显示，不打断看图
            });

        return () => {
            alive = false;
        };
    }, [previewItem?.characterId, userInfo]);

    /**
     * 收藏 / 取消收藏当前查看的单字卡片
     *
     * 先校验登录；已登录再校验这张单字有没有图——
     * 字典区偶有只登记了字、尚未裁出图片的记录，此时提示在集字而不是发请求。
     */
    const handleToggleFavorite = () => {
        const item = previewItem;

        if (!item) return;

        if (!userInfo) {
            message.info("登录之后才能收藏单字呢");
            navigate("/login");
            return;
        }

        if (!item.imageUrl) {
            message.info("字典库没有当前单字呢，小墨正在努力集字中");
            return;
        }

        if (favoriteSubmitting) return;

        setFavoriteSubmitting(true);

        const nextFavorited = !isFavorited;

        (
            nextFavorited
                ? favoriteCharacter(item.characterId)
                : unfavoriteCharacter(item.characterId)
        )
            .then((res) => {
                if (res.code === 200) {
                    setFavoritedId(nextFavorited ? item.characterId : null);
                    message.success(nextFavorited ? "收藏成功" : "已取消收藏");
                    return;
                }

                if (res.code === 4001) {
                    message.info("登录之后才能收藏单字呢");
                    navigate("/login");
                    return;
                }

                message.error(res.message || "操作失败，请稍后重试");
            })
            .catch(() => {
                message.error("操作失败，请检查网络后重试");
            })
            .finally(() => {
                setFavoriteSubmitting(false);
            });
    };

    // ==================== 查看器：隔空挥腕翻页 ====================

    /** 查看器下一张 / 上一张（到边界不动，避免越界序号） */
    const handleViewerNext = () => {
        setPreviewIndex((index) =>
            index == null || index >= currentList.length - 1
                ? index
                : index + 1
        );
    };

    const handleViewerPrev = () => {
        setPreviewIndex((index) =>
            index == null || index <= 0 ? index : index - 1
        );
    };

    const handWavePager = useHandWavePager({
        onSwipeUp: handleViewerPrev,
        onSwipeDown: handleViewerNext,
    });

    /**
     * 查看器内的「隔空翻页」开关
     *
     * 与临帖页同一套流程：点击只弹隐私提示，确认后才申请摄像头；
     * 面板只在看图器打开时渲染，关闭查看器一并停止识别释放摄像头。
     */
    const toggleGesturePager = () => {
        if (gestureOn) {
            handWavePager.stop();
            setGestureOn(false);
            return;
        }

        setGesturePrivacyOpen(true);
    };

    const confirmGesturePager = () => {
        setGesturePrivacyOpen(false);
        setGestureOn(true);
        void handWavePager.start();
    };

    const closeGesturePager = () => {
        handWavePager.stop();
        setGestureOn(false);
    };

    /** 关闭大图查看器：手势识别绑定查看器，一并停止 */
    const handleCloseViewer = () => {
        if (gestureOn) {
            handWavePager.stop();
            setGestureOn(false);
        }

        setPreviewIndex(null);
    };

    // ==================== 单字日荐：点碑帖名去临帖 ====================

    /**
     * 点击卡片里的《碑帖名》：跳该碑帖的单字临帖页
     *
     * 临帖页需登录，未登录先给一句友好提示再送登录页，
     * 并带 redirect 让登录完成后回到目标临帖页。
     */
    const handleGoPractise = (item: API.WebDictionaryCharacter) => {
        const target = `/copybook/${item.copybookId}/practise`;

        if (!userInfo) {
            message.info("登录之后再来临帖吧");
            navigate(`/login?redirect=${encodeURIComponent(target)}`);
            return;
        }

        navigate(target);
    };

    /**
     * 渲染单个旋转字环（内 / 外环共用结构，类名区分半径与转向）
     */
    const renderRing = (
        items: API.WebDictionaryCharacter[],
        ringClassName: string
    ) => {
        const dash = arcDash(items.length);

        return (
            <div className="dict-ring-clip" aria-hidden="true">
                <div className={`dict-ring ${ringClassName}`}>
                    {/* 分段弧轨：随字卡一起公转，弧落在相邻两卡之间 */}
                    <svg
                        className="dict-ring-arc"
                        viewBox="0 0 200 200"
                        focusable="false"
                    >
                        <circle
                            cx="100"
                            cy="100"
                            r="100"
                            strokeDasharray={dash.dasharray}
                            strokeDashoffset={dash.dashoffset}
                        />
                    </svg>

                    {items.map((item, index) => (
                        <div
                            key={item.characterId}
                            className="dict-ring__item"
                            style={
                                {
                                    "--i": index,
                                    "--step": `${360 / items.length}deg`,
                                    "--tilt":
                                        RING_TILTS[index % RING_TILTS.length],
                                    "--s":
                                        RING_SCALES[index % RING_SCALES.length],
                                } as CSSProperties
                            }
                        >
                            <div className="dict-ring__card">
                                <img
                                    src={item.imageUrl}
                                    alt={item.characterText || "书法单字"}
                                    draggable={false}
                                    loading="lazy"
                                    decoding="async"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    /** 字体筛选条（仅搜索态展示，位于动图下方） */
    const styleFilter = (
        <div className="flex flex-wrap justify-center gap-2">
            {STYLE_OPTIONS.map((option) => {
                const isActive = style === option.value;

                return (
                    <button
                        key={option.label}
                        type="button"
                        onClick={() => handleStyleChange(option.value)}
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
    );

    /** 单字卡片网格（单字日荐 / 搜索结果共用同一张卡片与同一套点击行为） */
    const renderCharacterGrid = (
        items: API.WebDictionaryCharacter[],
        offset = 0
    ) => (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center">
            {items.map((item, index) => (
                <CharacterFavoriteCard
                    key={item.characterId}
                    item={item}
                    onClick={() => handlePreview(index + offset)}
                    onCopybookClick={() => handleGoPractise(item)}
                />
            ))}
        </div>
    );

    // ==================== 渲染 ====================
    return (
        <div className="min-h-screen bg-[#FAF6ED] font-serif text-gray-800 select-none">
            {/* ---------- 页头 Hero：兰亭序底图 + 暗色遮罩 + 旋转字环 ---------- */}
            <div className="dict-hero">
                <div
                    className="dict-hero__bg"
                    style={{ backgroundImage: `url(${heroBg})` }}
                    aria-hidden="true"
                />
                <div className="dict-hero__scrim" aria-hidden="true" />

                {/* 双旋转字环：内环顺时针、外环逆时针圆弧（接口无数据时隐藏） */}
                {showcase.length > 0 && (
                    <>
                        {renderRing(ringOuter, "dict-ring--outer")}
                        {renderRing(ringInner, "dict-ring--inner")}
                    </>
                )}

                <div className="relative z-10 w-full max-w-xl px-4 pt-10 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-[#FFF8ED] tracking-[0.2em]">
                        书法字典
                    </h1>
                    <p className="mt-2.5 text-sm text-[#FFF8ED]/60 tracking-[0.15em]">
                        探寻汉字本义，品鉴历代书法
                    </p>

                    {/* 白色搜索栏：查询按钮嵌在栏内右侧 */}
                    <div className="dict-search-bar">
                        <SearchOutlined className="dict-search-bar__prefix" />
                        <Input
                            size="large"
                            allowClear
                            maxLength={8}
                            value={inputValue}
                            onChange={(e) =>
                                handleInputChange(e.target.value)
                            }
                            onPressEnter={(e) =>
                                handleSearch(
                                    (e.target as HTMLInputElement).value
                                )
                            }
                            placeholder="输入一个汉字，如：永"
                            className="dict-search-input"
                        />
                        <Button
                            type="primary"
                            size="large"
                            loading={listLoading}
                            onClick={() => handleSearch(inputValue)}
                            className="dict-search-btn"
                            icon={<SearchOutlined />}
                        >
                            查询
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-310 mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12">
                {queryChar ? (
                    <>
                        {/* ---------- 字体筛选：紧跟动图下方 ---------- */}
                        {styleFilter}

                        {/* ---------- 汉字释义区（上下布局，居中卡片） ---------- */}
                        <div className="mt-8">
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

                        {/* ---------- 该字历代书法单字 ---------- */}
                        <section className="mt-10">
                            <h2 className="text-lg font-bold text-[#3F332A] flex items-baseline gap-2">
                                {queryChar}
                                {total > 0 && (
                                    <span className="text-xs font-normal text-[#B8AFA4]">
                                        共 {total} 例
                                        {style ? ` · ${style}` : ""}
                                    </span>
                                )}
                            </h2>

                            <div className="mt-4">
                                {listLoading ? (
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
                                        {renderCharacterGrid(records)}

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
                    </>
                ) : (
                    <>
                        {/* ---------- 热搜碑帖 ---------- */}
                        <section>
                            <SectionTitle
                                title="热搜碑帖"
                                hint="按浏览量排序"
                                actionText="换一批"
                                loading={hotLoading}
                                onAction={handleHotRefresh}
                            />

                            <div className="mt-4">
                                {hotVisible.length === 0 ? (
                                    hotLoading ? (
                                        <div className="h-80">
                                            <MoyouLoading
                                                className="moyou-loading--compact"
                                                tip="正在检索热搜碑帖……"
                                            />
                                        </div>
                                    ) : (
                                        <div className="py-12">
                                            <Empty
                                                image={
                                                    Empty.PRESENTED_IMAGE_SIMPLE
                                                }
                                                description="热搜碑帖正在准备中，请稍后刷新"
                                            />
                                        </div>
                                    )
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                                        {hotVisible.map((item) => (
                                            <HotCopybookCard
                                                key={item.id}
                                                item={item}
                                                onOpen={(id) =>
                                                    navigate(`/copybook/${id}`)
                                                }
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* ---------- 单字日荐 ---------- */}
                        <section className="mt-12">
                            <SectionTitle
                                title="单字日荐"
                                hint="热门碑帖随机精选"
                                actionText="换一批"
                                loading={dailyLoading}
                                onAction={handleDailyRefresh}
                            />

                            <div className="mt-4">
                                {dailyChars.length === 0 ? (
                                    dailyLoading ? (
                                        <div className="h-80">
                                            <MoyouLoading
                                                className="moyou-loading--compact"
                                                tip="正在挑选单字……"
                                            />
                                        </div>
                                    ) : (
                                        <div className="py-12">
                                            <Empty
                                                image={
                                                    Empty.PRESENTED_IMAGE_SIMPLE
                                                }
                                                description="单字正在准备中，请稍后刷新"
                                            />
                                        </div>
                                    )
                                ) : (
                                    renderCharacterGrid(dailyChars)
                                )}
                            </div>
                        </section>

                        {/* ---------- 每日书论 ---------- */}
                        <section className="mt-12">
                            <SectionTitle
                                title="每日书论"
                                actionText="换一换"
                                loading={discourseLoading}
                                onAction={handleDiscourseRefresh}
                            />

                            {discourse ? (
                                <div className="dict-discourse mt-4">
                                    <div className="dict-discourse__head">
                                        <h3 className="dict-discourse__title">
                                            {discourse.title}
                                        </h3>
                                        {discourse.sourceUrl && (
                                            <a
                                                href={discourse.sourceUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="dict-discourse__source"
                                            >
                                                查看原文出处
                                            </a>
                                        )}
                                    </div>

                                    {/* 仿古籍竖排：右起书名、朝代作者，正文自右向左成列，最左为落款 */}
                                    <div
                                        className="dict-discourse__scroll"
                                        ref={discourseScrollRef}
                                    >
                                        <div className="dict-discourse__book">
                                            <div className="dict-discourse__col dict-discourse__col--book">
                                                {withBookMarks(
                                                    discourse.bookTitle
                                                )}
                                            </div>
                                            <div className="dict-discourse__col dict-discourse__col--author">
                                                {discourse.dynasty} ·{" "}
                                                {discourse.author}
                                            </div>
                                            <div className="dict-discourse__col dict-discourse__col--content">
                                                {discourse.content}
                                            </div>
                                            <div className="dict-discourse__col dict-discourse__col--date">
                                                {toChineseDate(new Date())}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : discourseLoading ? (
                                <div className="mt-4 h-60">
                                    <MoyouLoading
                                        className="moyou-loading--compact"
                                        tip="正在取书论……"
                                    />
                                </div>
                            ) : (
                                <div className="mt-4 py-12">
                                    <Empty
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        description="书论库暂无内容，请先在后台录入"
                                    />
                                </div>
                            )}
                        </section>
                    </>
                )}
            </main>

            {/* ---------- 单字预览（复用临帖页全屏查看器，与临帖页一样展示单字卡片） ---------- */}
            {previewIndex != null && previewItem && (
                <PractiseImageLightbox
                    total={currentList.length}
                    index={previewIndex}
                    onIndexChange={setPreviewIndex}
                    onClose={handleCloseViewer}
                    heading={`书法字典 · ${queryChar || "单字日荐"}`}
                    label={`${previewItem.characterText || "单字"} · ${
                        previewIndex + 1
                    }/${currentList.length}${
                        previewItem.style ? ` · ${previewItem.style}` : ""
                    }`}
                    loading={false}
                    error={
                        previewItem.imageUrl
                            ? null
                            : "该单字图片地址已失效，请关闭后重新查询"
                    }
                    toolbar={
                        <>
                            <button
                                type="button"
                                onClick={handleToggleFavorite}
                                disabled={favoriteSubmitting}
                                title={isFavorited ? "取消收藏" : "收藏这个单字"}
                                className={`${viewerToolButton} ${
                                    isFavorited ? "text-[#E8B4A0]" : ""
                                }`}
                            >
                                <Heart
                                    size={17}
                                    fill={isFavorited ? "currentColor" : "none"}
                                />
                            </button>
                            <button
                                type="button"
                                onClick={toggleGesturePager}
                                title={
                                    gestureOn ? "停止手势翻页" : "隔空翻页"
                                }
                                className={`${viewerToolButton} ${
                                    gestureOn ? "bg-[#964328]" : ""
                                }`}
                            >
                                <Hand size={17} />
                            </button>
                        </>
                    }
                >
                    <div className="pointer-events-auto">
                        <CharacterFavoriteCard
                            item={previewItem}
                            onClick={() => undefined}
                            sizeClassName="w-80 h-120"
                        />
                    </div>
                </PractiseImageLightbox>
            )}

            {/* ---------- 手势翻页面板（仅查看器打开时出现） ---------- */}
            {gestureOn && previewIndex != null && (
                <GesturePagerPanel
                    videoRef={handWavePager.videoRef}
                    status={handWavePager.status}
                    errorMessage={handWavePager.errorMessage}
                    lastSwipe={handWavePager.lastSwipe}
                    onStop={closeGesturePager}
                />
            )}

            {/* ---------- 进入手势翻页前的隐私提示 ---------- */}
            <GesturePrivacyNotice
                open={gesturePrivacyOpen}
                onCancel={() => setGesturePrivacyOpen(false)}
                onConfirm={confirmGesturePager}
            />
        </div>
    );
};

export default Dictionary;
