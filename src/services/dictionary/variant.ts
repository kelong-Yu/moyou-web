/**
 * 汉字简繁变体转换
 *
 * 背景：萌典词典以繁体字头收录（简体「龙」直接查询返回 404），
 * 而墨友字库 copybook_character.character_text 的简繁形态
 * 取决于碑帖 OCR 结果，两种都可能存在。
 * 因此查询时需要同时带上输入字的简繁变体：
 *
 * - 释义：按候选字头依次尝试萌典；
 * - 图片：后端按候选字集合 IN 匹配。
 *
 * 转换实现：opencc-js 的 core + 字符级字典
 * （STCharacters 简→繁、TSCharacters 繁→简）。
 * 本场景只转换单个汉字，无需词组级映射，
 * 相比完整 cn2t / t2cn 预设（含百万级短语表）体积缩小约 90%；
 * 并用动态 import 拆分 chunk，仅书法字典页首次查询时才下载。
 */

interface VariantConverters {
    /** 简体 → 繁体（字级） */
    toHant: (text: string) => string;
    /** 繁体 → 简体（字级） */
    toCn: (text: string) => string;
}

let convertersPromise: Promise<VariantConverters> | null = null;

/** 懒加载并缓存转换器（失败时清除缓存允许重试） */
function ensureConverters(): Promise<VariantConverters> {
    if (!convertersPromise) {
        convertersPromise = (async () => {
            const [core, stCharacters, tsCharacters] = await Promise.all([
                import("opencc-js/core"),
                import("opencc-js/dict/STCharacters"),
                import("opencc-js/dict/TSCharacters"),
            ]);

            return {
                toHant: core.CustomConverter(stCharacters.default),
                toCn: core.CustomConverter(tsCharacters.default),
            };
        })();

        convertersPromise.catch(() => {
            convertersPromise = null;
        });
    }

    return convertersPromise;
}

/**
 * 生成单个汉字的简繁候选字列表（含输入字本身，去重）
 *
 * 例：「龙」→ ["龙", "龍"]；「龍」→ ["龍", "龙"]；
 * 简繁同形字 → ["字"]。
 *
 * 转换器加载失败时降级为仅返回输入字本身，
 * 不阻塞查询主流程。
 *
 * 说明：一对多简化（如 干→乾/幹）字符级映射只取确定的一项，
 * 属已知限制，原始输入字始终包含在结果中。
 */
export async function getCharVariants(char: string): Promise<string[]> {
    const variants: string[] = [char];

    try {
        const { toHant, toCn } = await ensureConverters();

        for (const converted of [toHant(char), toCn(char)]) {
            if (
                converted &&
                converted !== char &&
                !variants.includes(converted)
            ) {
                variants.push(converted);
            }
        }
    } catch {
        // 转换不可用：至少保留输入字本身
    }

    return variants;
}
