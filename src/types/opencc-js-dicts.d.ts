/**
 * opencc-js 字符级字典子路径的类型声明
 *
 * 该包只为 "." / "./core" / "./preset" 等入口提供 .d.ts，
 * "./dict/*" 子路径经 exports 映射到 dist/esm-lib/dict/*.js，
 * 每个模块默认导出 "源字 目标字|…" 格式的字符串字典（DictLike）。
 */
declare module "opencc-js/dict/STCharacters" {
    const dict: string;
    export default dict;
}

declare module "opencc-js/dict/TSCharacters" {
    const dict: string;
    export default dict;
}
