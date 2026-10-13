import { Empty, Pagination, Spin } from "antd";
import { BookOutlined, EyeOutlined, RightOutlined, SearchOutlined, UserOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getDynastyList } from "../../services/dynasty/api";
import { search } from "../../services/search/api";
import { usePageMeta } from "../../hooks/usePageMeta";

const SEARCH_TYPES: { key: API.SearchType; label: string; hint: string }[] = [
    { key: "ALL", label: "全部", hint: "碑帖与书法家" },
    { key: "COPYBOOK", label: "碑帖", hint: "仅搜索碑帖" },
    { key: "CALLIGRAPHER", label: "书法家", hint: "仅搜索书法家" },
];
const STYLES = ["篆书", "隶书", "楷书", "行书", "草书"];

const SearchPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialKeyword = searchParams.get("keyword")?.trim() || "";
    const initialMatchType = searchParams.get("matchType") === "EXACT" ? "EXACT" : "FUZZY";
    const [keyword, setKeyword] = useState(initialKeyword);
    const [submittedKeyword, setSubmittedKeyword] = useState(initialKeyword);

    // 页面标题 + 浏览历史（有关键词时带上关键词）
    usePageMeta({
        title: submittedKeyword ? `搜索：${submittedKeyword}` : "搜索",
        pageType: "search",
    });
    const [searchType, setSearchType] = useState<API.SearchType>("ALL");
    const [matchType, setMatchType] = useState<API.MatchType>(initialMatchType);
    const [dynasties, setDynasties] = useState<API.Dynasty[]>([]);
    const [dynastyId, setDynastyId] = useState<number | undefined>();
    const [style, setStyle] = useState<string | undefined>();
    const [current, setCurrent] = useState(1);
    const [result, setResult] = useState<API.SearchTotalResponse>();
    const [loading, setLoading] = useState(true);
    const pageSize = searchType === "ALL" ? 6 : 12;

    useEffect(() => {
        let cancelled = false;
        getDynastyList().then(res => {
            if (!cancelled && res.code === 200) setDynasties(res.data || []);
        }).catch(error => console.error("获取朝代列表失败", error));
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        let cancelled = false;
        const fetchSearch = async () => {
            try {
                const res = await search({
                    keyword: submittedKeyword || undefined,
                    searchType,
                    matchType,
                    dynastyId,
                    style: searchType === "CALLIGRAPHER" ? undefined : style,
                    current,
                    pageSize,
                });
                if (!cancelled && res.code === 200) setResult(res.data);
            } catch (error) {
                console.error("搜索失败", error);
                if (!cancelled) setResult(undefined);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchSearch();
        return () => { cancelled = true; };
    }, [submittedKeyword, searchType, matchType, dynastyId, style, current, pageSize]);

    const copybooks = result?.copybooks?.records || [];
    const calligraphers = result?.calligraphers?.records || [];
    const isAll = searchType === "ALL";
    const activeDynastyName = useMemo(() => dynasties.find(item => item.id === dynastyId)?.name, [dynasties, dynastyId]);

    // 计算是否需要优先展示“书法家”部分
    const showCalligrapherFirst = isAll && copybooks.length === 0 && calligraphers.length > 0;

    const searchNow = () => {
        setSubmittedKeyword(keyword.trim());
        setCurrent(1);
        setSearchParams({ ...(keyword.trim() ? { keyword: keyword.trim() } : {}), ...(matchType === "EXACT" ? { matchType } : {}) });
    };
    const selectType = (next: API.SearchType) => { setSearchType(next); setCurrent(1); };
    const selectDynasty = (next?: number) => { setDynastyId(next); setCurrent(1); };
    const selectStyle = (next?: string) => { setStyle(next); setCurrent(1); };

    const copybookCard = (item: API.SearchCopybookResponse) => (
        <button key={item.id} type="button" onClick={() => navigate(`/copybook/${item.id}`)} className="group overflow-hidden rounded-xl border border-[#964328]/10 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-[#964328]/35 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#964328]">
            <div className="relative aspect-4/3 overflow-hidden bg-[#f1e6cf]">
                {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-[#964328]/50"><BookOutlined className="text-3xl" /></div>}
                <span className="absolute right-3 top-3 rounded-full bg-[#251811]/80 px-2.5 py-1 text-xs text-amber-50 backdrop-blur-sm">{item.style || "碑帖"}</span>
            </div>
            <div className="p-4">
                <h3 className="truncate font-serif text-lg font-bold text-[#2b211d] group-hover:text-[#964328]">{item.name}</h3>
                <p className="mt-2 truncate text-sm text-gray-500">{item.calligrapherName || "佚名"} · {item.dynastyName || "年代不详"}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-400"><span className="rounded bg-[#964328]/7 px-2 py-1 text-[#964328]">{item.dynastyName || "未知朝代"}</span><span className="flex items-center gap-1"><EyeOutlined /> {item.viewCount ?? 0}</span></div>
            </div>
        </button>
    );

    const calligrapherCard = (item: API.SearchCalligrapherResponse) => (
        <button key={item.id} type="button" onClick={() => navigate(`/aritcleWorks/${item.id}`)} className="group flex min-h-44 gap-4 rounded-xl border border-[#964328]/10 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#964328]/35 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#964328]">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-[#e8d7b7] bg-[#f4ead8]">{item.avatar ? <img src={item.avatar} alt={item.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" /> : <div className="flex h-full items-center justify-center text-[#964328]/50"><UserOutlined className="text-2xl" /></div>}</div>
            <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h3 className="truncate font-serif text-xl font-bold text-[#2b211d] group-hover:text-[#964328]">{item.name}</h3><RightOutlined className="text-xs text-[#964328]/60" /></div><span className="mt-2 inline-block rounded bg-[#964328]/7 px-2 py-1 text-xs text-[#964328]">{item.dynastyName || "年代不详"}</span><p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-500">{item.artisticLife || "暂未收录人物介绍"}</p></div>
        </button>
    );

    const pagination = (page?: API.PageResult<unknown>) => page && page.total > page.size ? <div className="mt-8 flex justify-center"><Pagination current={current} pageSize={page.size} total={page.total} showSizeChanger={false} onChange={setCurrent} /></div> : null;
    const sectionHeader = (title: string, count: number, icon: React.ReactNode) => <div className="mb-5 flex items-end justify-between border-b border-[#964328]/12 pb-3"><div className="flex items-center gap-2 font-serif text-xl font-bold text-[#2b211d]"><span className="text-[#964328]">{icon}</span>{title}<span className="font-sans text-sm font-normal text-gray-400">{count} 条结果</span></div></div>;

    // 抽离碑帖板块 JSX
    const copybookSection = (isAll || searchType === "COPYBOOK") && (
        <section key="copybook">
            {sectionHeader("相关碑帖", result?.copybooks?.total || 0, <BookOutlined />)}
            {copybooks.length > 0 ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{copybooks.map(copybookCard)}</div>
            ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有找到相关碑帖" />
            )}
            {!isAll && pagination(result?.copybooks)}
        </section>
    );

    // 抽离书法家板块 JSX
    const calligrapherSection = (isAll || searchType === "CALLIGRAPHER") && (
        <section key="calligrapher">
            {sectionHeader("相关书法家", result?.calligraphers?.total || 0, <UserOutlined />)}
            {calligraphers.length > 0 ? (
                <div className="grid gap-5 md:grid-cols-2">{calligraphers.map(calligrapherCard)}</div>
            ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有找到相关书法家" />
            )}
            {!isAll && pagination(result?.calligraphers)}
        </section>
    );

    return (
        <main className="min-h-screen bg-[#fcfaf5] pb-16 text-[#2b211d] pt-14">
            <section className="border-b border-[#964328]/12 bg-[radial-gradient(circle_at_top,#fffdf7_0,#f6efe2_100%)] px-5 py-12">
                <div className="mx-auto max-w-6xl">
                    <p className="mb-3 text-center font-serif text-sm tracking-[0.35em] text-[#964328]">墨友 · 文脉检索</p><h1 className="text-center font-serif text-3xl font-bold tracking-wide sm:text-4xl">搜索碑帖与书法家</h1>
                    <div className="mx-auto mt-7 flex max-w-4xl flex-col gap-3 rounded-2xl border border-[#964328]/18 bg-white p-3 shadow-[0_12px_36px_rgba(86,55,30,0.08)] sm:flex-row">
                        <div className="flex min-w-0 flex-1 items-center gap-3 px-3"><SearchOutlined className="text-lg text-[#964328]" /><input value={keyword} onChange={event => setKeyword(event.target.value)} onKeyDown={event => event.key === "Enter" && searchNow()} placeholder="输入碑帖名或书法家姓名" aria-label="搜索关键词" className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none placeholder:text-gray-400" /><button type="button" onClick={() => setMatchType(matchType === "FUZZY" ? "EXACT" : "FUZZY")} className="shrink-0 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-[#964328]/8 hover:text-[#964328] focus-visible:outline-2 focus-visible:outline-[#964328]" title="切换精确或模糊匹配">{matchType === "FUZZY" ? "模糊匹配" : "精确匹配"}</button></div>
                        <button type="button" onClick={searchNow} className="min-h-12 rounded-xl bg-[#b85c47] px-8 font-serif text-lg font-bold text-white transition hover:bg-[#964328] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#964328]">搜索</button>
                    </div>
                    <div className="mt-6 flex justify-center gap-1" role="tablist" aria-label="搜索范围">{SEARCH_TYPES.map(item => <button key={item.key} type="button" role="tab" aria-selected={searchType === item.key} onClick={() => selectType(item.key)} className={`rounded-lg px-4 py-2 text-sm transition focus-visible:outline-2 focus-visible:outline-[#964328] ${searchType === item.key ? "bg-[#964328] text-white shadow-sm" : "text-gray-500 hover:bg-[#964328]/8 hover:text-[#964328]"}`}>{item.label}<span className="hidden sm:inline"> · {item.hint}</span></button>)}</div>
                </div>
            </section>
            <div className="mx-auto grid max-w-7xl gap-8 px-5 py-9 lg:grid-cols-[220px_minmax(0,1fr)]">
                <aside className="h-fit rounded-xl border border-[#964328]/12 bg-white p-5 shadow-sm lg:sticky lg:top-24">
                    <div className="flex items-center gap-2 font-serif text-lg font-bold"><span className="h-5 w-1 rounded-full bg-[#b85c47]" />筛选条件</div>
                    <div className="mt-6 border-t border-[#964328]/10 pt-5"><h2 className="text-sm font-semibold tracking-wide text-gray-500">朝代</h2><div className="mt-3 flex max-h-65 flex-wrap gap-2 overflow-y-auto pr-1"><button type="button" onClick={() => selectDynasty()} className={`rounded-md px-3 py-1.5 text-sm transition ${!dynastyId ? "bg-[#964328] text-white" : "bg-[#f8f3ea] text-gray-600 hover:bg-[#964328]/12"}`}>全部</button>{dynasties.map(item => <button key={item.id} type="button" onClick={() => selectDynasty(item.id)} className={`rounded-md px-3 py-1.5 text-sm transition ${dynastyId === item.id ? "bg-[#964328] text-white" : "bg-[#f8f3ea] text-gray-600 hover:bg-[#964328]/12"}`}>{item.name}</button>)}</div></div>
                    <div className={`mt-6 border-t border-[#964328]/10 pt-5 ${searchType === "CALLIGRAPHER" ? "opacity-45" : ""}`}><div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold tracking-wide text-gray-500">书体风格</h2>{searchType === "CALLIGRAPHER" && <span className="text-[11px] text-gray-400">仅碑帖</span>}</div><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={searchType === "CALLIGRAPHER"} onClick={() => selectStyle()} className={`rounded-md px-3 py-1.5 text-sm transition disabled:cursor-not-allowed ${!style ? "bg-[#964328] text-white" : "bg-[#f8f3ea] text-gray-600 hover:bg-[#964328]/12"}`}>全部</button>{STYLES.map(item => <button key={item} type="button" disabled={searchType === "CALLIGRAPHER"} onClick={() => selectStyle(item)} className={`rounded-md px-3 py-1.5 text-sm transition disabled:cursor-not-allowed ${style === item ? "bg-[#964328] text-white" : "bg-[#f8f3ea] text-gray-600 hover:bg-[#964328]/12"}`}>{item}</button>)}</div></div>
                    {(dynastyId || style) && <button type="button" onClick={() => { selectDynasty(); selectStyle(); }} className="mt-6 text-sm text-[#964328] hover:underline">清除全部筛选</button>}
                </aside>
                <section className="min-w-0"><div className="mb-7 flex flex-wrap items-center justify-between gap-3"><div><p className="font-serif text-2xl font-bold">{submittedKeyword ? <>“{submittedKeyword}” 的搜索结果</> : "全部内容"}</p><p className="mt-1 text-sm text-gray-500">{activeDynastyName ? `${activeDynastyName} · ` : ""}{style ? `${style} · ` : ""}{matchType === "FUZZY" ? "模糊匹配" : "精确匹配"}</p></div><span className="rounded-full border border-[#964328]/15 bg-white px-3 py-1.5 text-sm text-[#964328]">{SEARCH_TYPES.find(item => item.key === searchType)?.label}搜索</span></div>
                    {loading ? (
                        <div className="flex min-h-80 items-center justify-center"><Spin size="large" tip="正在检索墨友藏品…" /></div>
                    ) : (
                        <div className="space-y-10">
                            {showCalligrapherFirst ? (
                                <>
                                    {calligrapherSection}
                                    {copybookSection}
                                </>
                            ) : (
                                <>
                                    {copybookSection}
                                    {calligrapherSection}
                                </>
                            )}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
};
export default SearchPage;