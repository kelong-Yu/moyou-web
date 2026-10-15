import { LinkOutlined } from "@ant-design/icons";
import MoyouLoading from "../../../components/MoyouLoading";
import {
    moedictEntryUrl,
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
 * 汉字释义区域（萌典 MoeDict）
 *
 * 按萌典 raw 端点真实字段渲染：
 * 读音（pinyin / bopomofo）、部首（radical）、
 * 笔画数（stroke_count / non_radical_stroke_count）、
 * 义项（heteronyms[].definitions[]：词性 type + 释义 def +
 * 书证 quote + 例句 example）。
 *
 * 字段缺失时仅隐藏对应项；释义文本保持萌典原始繁体内容，
 * 全部按纯文本渲染（不使用 innerHTML）；
 * 底部标注来源并链接到萌典对应词条页。
 */
const MoeDictExplanation = ({ char, state, entry }: MoeDictExplanationProps) => {
    // ==================== 非正常状态 ====================
    if (state === "loading") {
        return (
            <div className="rounded-xl border border-[#964328]/15 bg-white/70 shadow-sm p-4">
                <div className="h-28">
                    <MoyouLoading
                        className="moyou-loading--compact"
                        tip="正在查询释义……"
                    />
                </div>
            </div>
        );
    }

    if (state === "notFound") {
        return (
            <div className="rounded-xl border border-[#964328]/15 bg-white/70 shadow-sm px-5 py-6 text-center">
                <p className="text-sm text-[#756B61]">暂未获取到该字的释义</p>
            </div>
        );
    }

    if (state === "error" || !entry) {
        return (
            <div className="rounded-xl border border-[#964328]/15 bg-white/70 shadow-sm px-5 py-6 text-center">
                <p className="text-sm text-[#756B61]">
                    释义服务暂时不可用，不影响下方书法作品的浏览
                </p>
            </div>
        );
    }

    // ==================== 词条展示 ====================
    // 多音字时在每个义项组前标注对应读音；单音不重复展示
    const multiPronunciation = entry.heteronyms.length > 1;

    return (
        <div className="rounded-xl border border-[#964328]/15 bg-white/70 shadow-sm px-5 py-5 md:px-7 md:py-6">
            {/* 字头：大字 + 读音 / 部首 / 笔画 */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-7">
                <span className="text-6xl md:text-7xl font-bold text-[#3F332A] leading-none select-none">
                    {entry.title || char}
                </span>

                <div className="min-w-0 space-y-1.5 text-sm">
                    {/* 简繁输入与词条字头不一致时的说明（如输入「龙」命中繁体字头「龍」） */}
                    {entry.title && entry.title !== char && (
                        <p className="text-[13px] text-[#964328]">
                            词条字头为「{entry.title}」，与输入字「{char}
                            」为简繁对应
                        </p>
                    )}

                    {(entry.pinyinList.length > 0 ||
                        entry.bopomofoList.length > 0) && (
                        <p className="text-[#3F332A]">
                            {entry.pinyinList.length > 0 && (
                                <>
                                    <span className="text-[#756B61]">
                                        拼音：
                                    </span>
                                    {entry.pinyinList.join(" / ")}
                                </>
                            )}
                            {entry.bopomofoList.length > 0 && (
                                <span className="ml-4">
                                    <span className="text-[#756B61]">
                                        注音：
                                    </span>
                                    {entry.bopomofoList.join(" / ")}
                                </span>
                            )}
                        </p>
                    )}

                    {(entry.radical ||
                        entry.strokeCount != null) && (
                        <p className="text-[#3F332A]">
                            {entry.radical && (
                                <>
                                    <span className="text-[#756B61]">
                                        部首：
                                    </span>
                                    {entry.radical}
                                </>
                            )}
                            {entry.strokeCount != null && (
                                <span className="ml-4">
                                    <span className="text-[#756B61]">
                                        笔画：
                                    </span>
                                    {entry.strokeCount}
                                    {entry.nonRadicalStrokeCount != null
                                        ? `（部外 ${entry.nonRadicalStrokeCount}）`
                                        : ""}
                                </span>
                            )}
                        </p>
                    )}
                </div>
            </div>

            {/* 义项列表 */}
            <div className="mt-5 space-y-4">
                {entry.heteronyms.map((heteronym, hIndex) => (
                    <div
                        key={hIndex}
                        className="space-y-2.5"
                    >
                        {multiPronunciation && (heteronym.pinyin ||
                            heteronym.bopomofo) && (
                            <p className="text-sm font-bold text-[#964328]">
                                {[heteronym.pinyin, heteronym.bopomofo]
                                    .filter(Boolean)
                                    .join(" · ")}
                            </p>
                        )}

                        {heteronym.definitions.map((definition, dIndex) => (
                            <div key={dIndex}>
                                <p className="text-[15px] leading-7 text-[#3F332A]">
                                    {definition.type && (
                                        <span className="inline-block mr-2 align-middle px-1.5 py-0.5 rounded text-xs bg-[#964328]/10 text-[#964328] border border-[#964328]/25">
                                            {definition.type}
                                        </span>
                                    )}
                                    {definition.def}
                                </p>

                                {/* 书证 */}
                                {definition.quote &&
                                    definition.quote.length > 0 && (
                                        <div className="mt-1 space-y-0.5">
                                            {definition.quote.map(
                                                (quote, qIndex) => (
                                                    <p
                                                        key={qIndex}
                                                        className="text-[13px] leading-6 text-[#8B8178] pl-1 border-l-2 border-[#964328]/20 ml-0.5"
                                                    >
                                                        {quote}
                                                    </p>
                                                )
                                            )}
                                        </div>
                                    )}

                                {/* 例句 */}
                                {definition.example &&
                                    definition.example.length > 0 && (
                                        <p className="mt-1 text-[13px] leading-6 text-[#8B8178]">
                                            {definition.example.join(" ")}
                                        </p>
                                    )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* 来源标注 */}
            <p className="mt-5 pt-3 border-t border-[#964328]/10 text-xs text-[#8B8178] flex flex-wrap items-center gap-1">
                <span>释义来源：萌典 MoeDict（原文保留繁体）</span>
                <a
                    href={moedictEntryUrl(entry.title || char)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#964328] hover:underline"
                >
                    <LinkOutlined />
                    查看原词条
                </a>
            </p>
        </div>
    );
};

export default MoeDictExplanation;
