import axios from "axios";

/**
 * 萌典（MoeDict）公开词典 API 请求封装
 *
 * 使用纯文字华语词条端点（已实测「永」字返回结构）：
 *
 *   GET https://www.moedict.tw/raw/{encodeURIComponent(汉字)}.json
 *
 * 真实返回结构（raw 端点已移除释义中的 <a> 链接标记，便于直接展示）：
 *
 *   {
 *     title: "永",
 *     heteronyms: [
 *       {
 *         pinyin: "yǒng",
 *         bopomofo: "ㄩㄥˇ",
 *         bopomofo2: "üěng",          // 可能存在
 *         definitions: [
 *           { type: "形", def: "深長的、久遠的。", quote: ["…"] },
 *           { type: "副", def: "恆久、久遠。", quote: ["…"], example: ["…"] }
 *         ]
 *       }
 *     ],
 *     radical: "水",
 *     stroke_count: 5,
 *     non_radical_stroke_count: 1
 *   }
 *
 * 约定：
 * 1. 独立 axios 实例，不共用项目 /api 封装，不影响现有请求；
 * 2. 404 视为「该字无词条」（返回 null），
 *    网络超时 / 5xx / 结构异常视为「释义服务暂不可用」（抛错由调用方降级展示）；
 * 3. 页面级内存缓存，同字重复查询不再发请求；
 * 4. 词条文本保持萌典原始繁体内容，不做任何改写 / 简繁转换，
 *    全部按纯文本渲染，绝不使用 innerHTML 注入。
 */

/** 单个义项 */
export interface MoedictDefinition {
    /** 词性，如 形 / 副 / 动（可能缺失） */
    type?: string;
    /** 释义正文 */
    def: string;
    /** 书证（引文），可能缺失 */
    quote?: string[];
    /** 例词，可能缺失 */
    example?: string[];
}

/** 一个读音及其义项列表 */
export interface MoedictHeteronym {
    pinyin?: string;
    bopomofo?: string;
    definitions: MoedictDefinition[];
}

/** 归一化后的词条（页面展示用） */
export interface MoedictEntry {
    /** 查询汉字 */
    title: string;
    /** 普通话读音（可能多个） */
    pinyinList: string[];
    /** 注音读音（可能多个） */
    bopomofoList: string[];
    /** 部首，可能缺失 */
    radical?: string;
    /** 笔画数，可能缺失 */
    strokeCount?: number;
    /** 部外笔画数，可能缺失 */
    nonRadicalStrokeCount?: number;
    /** 读音 + 义项明细 */
    heteronyms: MoedictHeteronym[];
}

/** 萌典词条页地址（来源链接） */
export function moedictEntryUrl(char: string): string {
    return `https://www.moedict.tw/${encodeURIComponent(char)}`;
}

/**
 * 独立请求实例：
 * 不走项目 Axios 实例（其 baseURL=/api、拦截器面向自有后端），
 * 超时 8 秒，避免外部服务慢时拖住页面。
 */
const moedictClient = axios.create({
    baseURL: "https://www.moedict.tw",
    timeout: 8000,
});

/** 页面会话级内存缓存：汉字 -> 词条（null = 已确认无词条） */
const entryCache = new Map<string, MoedictEntry | null>();

/** 萌典返回对象的宽松外形（仅用于结构校验与取值） */
type RawRecord = Record<string, unknown>;

/** 校验并归一化萌典 raw 端点返回，结构不符合预期时抛错 */
function normalize(raw: unknown, char: string): MoedictEntry {
    if (
        !raw ||
        typeof raw !== "object" ||
        !Array.isArray((raw as RawRecord).heteronyms)
    ) {
        throw new Error("unexpected moedict payload");
    }

    const source = raw as RawRecord;

    const heteronyms: MoedictHeteronym[] = [];

    for (const item of source.heteronyms as unknown[]) {
        if (!item || typeof item !== "object") continue;

        const h = item as RawRecord;

        const definitions: MoedictDefinition[] = (
            Array.isArray(h.definitions) ? h.definitions : []
        )
            .filter(
                (d): d is RawRecord =>
                    !!d &&
                    typeof d === "object" &&
                    typeof (d as RawRecord).def === "string"
            )
            .map((d) => ({
                type:
                    typeof d.type === "string" && d.type
                        ? d.type
                        : undefined,
                def: d.def as string,
                quote: Array.isArray(d.quote)
                    ? (d.quote as unknown[]).filter(
                          (q): q is string => typeof q === "string" && !!q
                      )
                    : undefined,
                example: Array.isArray(d.example)
                    ? (d.example as unknown[]).filter(
                          (e): e is string => typeof e === "string" && !!e
                      )
                    : undefined,
            }));

        heteronyms.push({
            pinyin:
                typeof h.pinyin === "string" && h.pinyin
                    ? h.pinyin
                    : undefined,
            bopomofo:
                typeof h.bopomofo === "string" && h.bopomofo
                    ? h.bopomofo
                    : undefined,
            definitions,
        });
    }

    return {
        title:
            typeof source.title === "string" && source.title
                ? source.title
                : char,
        pinyinList: heteronyms
            .map((h) => h.pinyin)
            .filter((p): p is string => !!p),
        bopomofoList: heteronyms
            .map((h) => h.bopomofo)
            .filter((p): p is string => !!p),
        radical:
            typeof source.radical === "string" && source.radical.trim()
                ? source.radical.trim()
                : undefined,
        strokeCount:
            typeof source.stroke_count === "number"
                ? source.stroke_count
                : undefined,
        nonRadicalStrokeCount:
            typeof source.non_radical_stroke_count === "number"
                ? source.non_radical_stroke_count
                : undefined,
        heteronyms,
    };
}

/**
 * 查询单个汉字的萌典释义
 *
 * @returns 词条数据；null 表示萌典确认无该字词条（404）
 * @throws 网络错误 / 超时 / 5xx / 结构异常（调用方展示「释义暂时不可用」）
 */
export async function fetchMoedictEntry(
    char: string
): Promise<MoedictEntry | null> {
    if (entryCache.has(char)) {
        return entryCache.get(char) ?? null;
    }

    try {
        const res = await moedictClient.get(
            `/raw/${encodeURIComponent(char)}.json`
        );

        const entry = normalize(res.data, char);
        entryCache.set(char, entry);
        return entry;
    } catch (error) {
        // 404：萌典明确没有该词条，按「暂无释义」处理并缓存
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            entryCache.set(char, null);
            return null;
        }

        // 其余异常（超时 / 断网 / 5xx / 结构异常）向上抛出，
        // 由调用方展示「释义暂时不可用」，不得当作无释义
        throw error;
    }
}

/**
 * 按简繁候选字依次查询萌典
 *
 * 萌典以繁体字头收录，简体输入（如「龙」）直接查询会 404，
 * 需带上变体候选（如「龍」）逐个尝试；
 * 任一候选命中即返回（entry.title 为实际字头，可能与输入不同）。
 *
 * @returns 命中的词条；所有候选均 404 时返回 null
 * @throws 服务异常（首个非 404 错误即抛出，不再继续尝试）
 */
export async function fetchMoedictEntryAny(
    chars: string[]
): Promise<MoedictEntry | null> {
    for (const char of chars) {
        const entry = await fetchMoedictEntry(char);

        if (entry) {
            return entry;
        }
    }

    return null;
}
