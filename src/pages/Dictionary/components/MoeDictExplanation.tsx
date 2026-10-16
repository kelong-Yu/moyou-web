import { LinkOutlined } from "@ant-design/icons";
import MoyouLoading from "../../../components/MoyouLoading";
import {
    moedictEntryUrl,
    type MoedictDefinition,
    type MoedictEntry,
} from "../../../services/dictionary/moedict";

export interface MoeDictExplanationProps {
    /** 查询汉字 */
    char: string;

    /** 释义加载状态 */
    state: "loading" | "ready" | "notFound" | "error";

    /** 归一化后的萌典词条（state=ready 时有值） */
    entry: MoedictEntry | null;
}

/**
 * 最多展示的义项条数
 *
 * 萌典对常用字（如「蘭」「一」）会返回几十条义项，
 * 而卡片最大高度是固定的，全量渲染会把版面撑爆，
 * 因此只取最靠前的几条，其余在正文末尾说明条数并引导去原词条看全量。
 */
const MAX_DEFINITIONS = 4;

/** 每条义项最多展示的书证条数 */
const MAX_QUOTES = 1;

/**
 * 汉字释义卡（萌典 MoeDict）
 *
 * 暗底居中排版：字头大字 → 读音 / 部首 / 笔画元信息行 → 义项列表。
 * 义项按 MAX_DEFINITIONS 截断，卡片整体最大高度固定、仅正文区可滚动；
 * 字段缺失时只隐藏对应项；释义保持萌典原始繁体内容，
 * 全部按纯文本渲染（不使用 innerHTML）；底部保留来源与原词条链接。
 */
const MoeDictExplanation = ({ char, state, entry }: MoeDictExplanationProps) => {
    // ==================== 非正常状态 ====================
    if (state === "loading") {
        return (
            <div className="dict-explain dict-explain--state">
                <div className="h-28 w-full">
                    <MoyouLoading
                        dark
                        className="moyou-loading--compact"
                        tip="正在查询释义……"
                    />
                </div>
            </div>
        );
    }

    if (state === "notFound") {
        return (
            <div className="dict-explain dict-explain--state">
                暂未获取到「{char}」的释义
            </div>
        );
    }

    if (state === "error" || !entry) {
        return (
            <div className="dict-explain dict-explain--state">
                释义服务暂时不可用
            </div>
        );
    }

    // ==================== 义项截断 ====================
    // 多音字时在每个义项组前标注对应读音；单音不重复展示
    const multiPronunciation = entry.heteronyms.length > 1;

    const groups: { pron: string; definitions: MoedictDefinition[] }[] = [];
    let used = 0;
    let totalCount = 0;

    for (const heteronym of entry.heteronyms) {
        totalCount += heteronym.definitions.length;

        if (used >= MAX_DEFINITIONS) continue;

        const taken = heteronym.definitions.slice(0, MAX_DEFINITIONS - used);
        used += taken.length;

        groups.push({
            pron: [heteronym.pinyin, heteronym.bopomofo]
                .filter(Boolean)
                .join(" · "),
            definitions: taken,
        });
    }

    const omitted = Math.max(0, totalCount - used);

    // ==================== 词条展示 ====================
    return (
        <div className="dict-explain font-serif">
            <div className="dict-explain__char">{entry.title || char}</div>

            {/* 简繁输入与词条字头不一致时的说明（如输入「龙」命中繁体字头「龍」） */}
            {entry.title && entry.title !== char && (
                <p className="dict-explain__variant">
                    词条字头为「{entry.title}」，与输入字「{char}」为简繁对应
                </p>
            )}

            <div className="dict-explain__meta">
                {entry.pinyinList.length > 0 && (
                    <span>{entry.pinyinList.join(" / ")}</span>
                )}
                {entry.bopomofoList.length > 0 && (
                    <span>{entry.bopomofoList.join(" / ")}</span>
                )}
                {entry.radical && <span>部首：{entry.radical}</span>}
                {entry.strokeCount != null && (
                    <span>
                        {entry.strokeCount} 画
                        {entry.nonRadicalStrokeCount != null
                            ? `（部外 ${entry.nonRadicalStrokeCount}）`
                            : ""}
                    </span>
                )}
            </div>

            <div className="dict-explain__body">
                {groups.map((group, groupIndex) => (
                    <div className="dict-explain__group" key={groupIndex}>
                        {multiPronunciation && group.pron && (
                            <p className="dict-explain__pron">{group.pron}</p>
                        )}

                        {group.definitions.map((definition, dIndex) => (
                            <div key={dIndex}>
                                <p className="dict-explain__item">
                                    {definition.type && (
                                        <span className="dict-explain__type">
                                            {definition.type}
                                        </span>
                                    )}
                                    {definition.def}
                                </p>

                                {(definition.quote?.length ?? 0) > 0 && (
                                    <p className="dict-explain__cite">
                                        {definition
                                            .quote!.slice(0, MAX_QUOTES)
                                            .join("　")}
                                    </p>
                                )}

                                {(definition.example?.length ?? 0) > 0 && (
                                    <p className="dict-explain__cite">
                                        {definition.example!.join(" ")}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                ))}

                {omitted > 0 && (
                    <p className="dict-explain__more">
                        另有 {omitted} 条释义未展示（共 {totalCount} 条）
                    </p>
                )}
            </div>

            <p className="dict-explain__source">
                释义来源：萌典 MoeDict（原文保留繁体）
                <a
                    href={moedictEntryUrl(entry.title || char)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dict-explain__link"
                >
                    <LinkOutlined /> 查看原词条
                </a>
            </p>
        </div>
    );
};

export default MoeDictExplanation;
