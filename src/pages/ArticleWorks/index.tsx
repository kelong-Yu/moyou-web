import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CalligrapherDetailDrawer from "../../components/CalligrapherDetailDrawer";
import {
    EyeOutlined,
    HeartOutlined,
    LikeOutlined,
    MessageOutlined,
    BookOutlined,
    PlusOutlined,
    CheckOutlined,
    UserOutlined,
    RightOutlined
} from "@ant-design/icons";
import { Spin, Empty, message } from "antd";
import { getCalligrapherWorks } from "../../services/calligrapher/api";
import bgImg from "../../assets/lantingxu.jpg";

// 一级导航：作品 / 粉丝
type MainTabType = "works" | "fans";
// 作品二级筛选
type TabType = "all" | "hot" | "latest";

const ArticleWorks = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState<boolean>(true);
    const [data, setData] = useState<API.CalligrapherWorksResponse | null>(null);

    // 交互状态
    const [isFollowed, setIsFollowed] = useState<boolean>(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
    const [activeMainTab, setActiveMainTab] = useState<MainTabType>("works");
    const [activeTab, setActiveTab] = useState<TabType>("all");
    const [followedFanIds, setFollowedFanIds] = useState<number[]>([]);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        getCalligrapherWorks(Number(id))
            .then((res: any) => {
                if (res?.code === 200) {
                    setData(res.data);
                } else if (res?.id) {
                    setData(res);
                }
            })
            .finally(() => {
                setLoading(false);
            });
    }, [id]);

    // 计算所有作品的总获赞量
    const totalLikes = useMemo(() => {
        if (!data?.copybooks) return 0;
        return data.copybooks.reduce((sum, item) => sum + (item.likeCount || 0), 0);
    }, [data]);

    // 格式化作品列表
    const sortedWorks = useMemo(() => {
        if (!data?.copybooks) return [];
        const works = [...data.copybooks];

        if (activeTab === "hot") {
            return works.sort((a, b) => ((b.likeCount || 0) + (b.viewCount || 0)) - ((a.likeCount || 0) + (a.viewCount || 0)));
        }
        if (activeTab === "latest") {
            return works.sort((a, b) => Number(b.id) - Number(a.id));
        }
        return works;
    }, [data, activeTab]);

    // 关注操作切换
    const handleFollowToggle = () => {
        setIsFollowed(!isFollowed);
        message.success(isFollowed ? "已取消关注" : "关注成功");
    };

    const mockFansList = [
        { id: 1, name: "墨客千寻", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=1", bio: "钟情行草，醉心书法" },
        { id: 2, name: "兰亭遗风", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=2", bio: "临池研墨三十载" },
        { id: 3, name: "竹影扫阶", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=3", bio: "古法字帖收藏者" },
        { id: 4, name: "砚池清欢", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=4", bio: "书法爱好者" },
    ];

    // 粉丝回关状态（前端本地交互）
    const handleFanFollowToggle = (fanId: number) => {
        const isAlreadyFollowed = followedFanIds.includes(fanId);
        setFollowedFanIds((current) =>
            current.includes(fanId)
                ? current.filter((item) => item !== fanId)
                : [...current, fanId]
        );
        message.success(isAlreadyFollowed ? "已取消回关" : "回关成功");
    };

    return (
        <div className="min-h-screen bg-[#FAF6ED] font-serif text-gray-800 pb-16 select-none">
            {/* 1. 顶部英雄区 */}
            <div className="relative overflow-hidden bg-[#121110] text-white pt-24 pb-12">
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity pointer-events-none"
                    style={{ backgroundImage: `url(${bgImg})` }}
                />
                <div className="absolute inset-0 bg-linear-to-r from-[#121110] via-[#121110]/80 to-transparent pointer-events-none" />

                <div className="relative z-10 max-w-310 mx-auto px-4 sm:px-6 lg:px-8">
                    {loading ? (
                        <div className="py-12 text-center">
                            <Spin size="large" />
                        </div>
                    ) : data ? (
                        <div className="space-y-5">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-5 sm:gap-6">
                                    <div className="relative shrink-0">
                                        <img
                                            src={data.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"}
                                            alt={data.name}
                                            className="w-22 h-22 sm:w-28 sm:h-28 rounded-full object-cover border-2 border-amber-500/40 shadow-xl"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <h1 className="text-2xl sm:text-3xl font-bold tracking-wide text-amber-50">
                                                {data.name}
                                            </h1>
                                            {data.title && (
                                                <span className="px-2 py-0.5 text-xs bg-[#964328] text-amber-100 rounded border border-amber-200/20">
                                                    {data.title}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 text-sm text-gray-300">
                                            <button
                                                type="button"
                                                onClick={() => setActiveMainTab("fans")}
                                                className="flex items-baseline gap-1 cursor-pointer hover:text-amber-300 transition-colors bg-transparent border-0 p-0"
                                            >
                                                <span className="text-xs text-gray-400">粉丝</span>
                                                <span className="font-semibold text-white">1.2万</span>
                                            </button>

                                            <span className="w-px h-3 bg-gray-600/80 my-auto" />

                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xs text-gray-400">获赞</span>
                                                <span className="font-semibold text-white">
                                                    {totalLikes > 0 ? totalLikes : "9.1万"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* 朝代与生卒年展示部分 */}
                                        <div className="flex items-center gap-3 text-xs text-gray-300/90 pt-0.5">
                                            {data.dynastyName && (
                                                <span><span className="text-amber-100/90">{data.dynastyName}</span></span>
                                            )}
                                            {data.dynastyName && (
                                                <span className="text-amber-100/90"> · </span>
                                            )}
                                            <span className="font-sans">
                                                <span className="text-amber-100/90">
                                                    {data.birthYear && data.deathYear
                                                        ? `${data.birthYear} ~ ${data.deathYear}`
                                                        : data.birthYear
                                                        ? `${data.birthYear} ~ ?`
                                                        : data.deathYear
                                                        ? `? ~ ${data.deathYear}`
                                                        : "?"}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="shrink-0 flex flex-col items-end gap-2.5">
                                    <button
                                        onClick={handleFollowToggle}
                                        className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                                            isFollowed
                                                ? "bg-white/15 text-gray-200 hover:bg-white/20 border border-white/20"
                                                : "bg-[#964328] hover:bg-[#7e3720] text-amber-50 border border-amber-500/30 shadow-md active:scale-95"
                                        }`}
                                    >
                                        {isFollowed ? (
                                            <><CheckOutlined className="text-xs" /> 已关注</>
                                        ) : (
                                            <><PlusOutlined className="text-xs" /> 关注</>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-start justify-between gap-4 pt-2 border-t border-white/10">
                                {data.artisticLife ? (
                                    <p className="text-xs sm:text-sm text-gray-300/90 leading-relaxed line-clamp-2 flex-1">
                                        {data.artisticLife}
                                    </p>
                                ) : (
                                    <div className="flex-1" />
                                )}
                                <button
                                    onClick={() => setIsDrawerOpen(true)}
                                    className="shrink-0 text-xs text-amber-200/80 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors group pt-0.5"
                                >
                                    <span >完整介绍</span>
                                    <RightOutlined className="text-[10px] mr-2 group-hover:translate-x-0.5 transition-transform" />
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* 2. 一级导航与内容区 */}
            <main className="max-w-310 mx-auto px-4 sm:px-6 lg:px-8 pt-4">
                {/* 一级导航：作品 / 粉丝 */}
                <div className="border-b border-[#964328]/15 mb-5">
                    <div className="flex items-center gap-8 sm:gap-10">
                        <button
                            type="button"
                            onClick={() => setActiveMainTab("works")}
                            className={`relative flex items-center gap-2 py-4 text-base transition-colors cursor-pointer ${
                                activeMainTab === "works"
                                    ? "font-bold text-[#964328]"
                                    : "text-[#756B61] hover:text-[#964328]"
                            }`}
                        >
                            <BookOutlined />
                            <span>作品</span>
                            {activeMainTab === "works" && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#964328]" />
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveMainTab("fans")}
                            className={`relative flex items-center gap-2 py-4 text-base transition-colors cursor-pointer ${
                                activeMainTab === "fans"
                                    ? "font-bold text-[#964328]"
                                    : "text-[#756B61] hover:text-[#964328]"
                            }`}
                        >
                            <UserOutlined />
                            <span>粉丝</span>
                            {activeMainTab === "fans" && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#964328]" />
                            )}
                        </button>
                    </div>
                </div>

                {activeMainTab === "works" ? (
                    <>
                        {/* 作品二级导航：全部 / 最新 / 最热 */}
                        <div className="flex items-center gap-2 mb-6">
                            {([
                                { key: "all", label: "全部" },
                                { key: "latest", label: "最新" },
                                { key: "hot", label: "最热" },
                            ] as const).map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`px-4 py-1.5 rounded-full text-sm transition-all cursor-pointer border ${
                                        activeTab === tab.key
                                            ? "bg-[#964328] text-[#FFF8ED] border-[#964328] shadow-sm"
                                            : "bg-white/65 text-[#756B61] border-[#964328]/15 hover:border-[#964328]/40 hover:text-[#964328]"
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {loading ? (
                            <div className="py-20 text-center">
                                <Spin size="large" tip="正在加载作品列表..." />
                            </div>
                        ) : sortedWorks.length === 0 ? (
                            <div className="py-20 bg-white/50 rounded-xl border border-[#964328]/10 text-center">
                                <Empty description="暂无相关碑帖作品" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {sortedWorks.map((item: API.WebCopybookResponse) => (
                                    <div
                                        key={item.id}
                                        onClick={() => navigate(`/copybook/${item.id}`)}
                                        className="group bg-white rounded-xl overflow-hidden border border-[#964328]/15 hover:border-[#964328]/40 shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between"
                                    >
                                        <div className="relative aspect-4/3 overflow-hidden bg-gray-100">
                                            {item.imageUrl ? (
                                                <img
                                                    src={item.imageUrl}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                                                    <BookOutlined className="text-3xl mb-1" />
                                                    <span className="text-xs">暂无图片</span>
                                                </div>
                                            )}

                                            {item.style && (
                                                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 text-xs bg-[#1A1815]/80 text-amber-100 backdrop-blur-xs rounded shadow-xs">
                                                    {item.style}
                                                </span>
                                            )}
                                        </div>

                                        <div className="p-4 flex-1 flex flex-col justify-between">
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-base group-hover:text-[#964328] transition-colors line-clamp-1 mb-1">
                                                    《{item.name}》
                                                </h3>
                                                {item.shortDescription && (
                                                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-3">
                                                        {item.shortDescription}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex items-center gap-1 hover:text-gray-600">
                                                        <EyeOutlined /> {item.viewCount ?? 0}
                                                    </span>
                                                    <span className="flex items-center gap-1 hover:text-gray-600">
                                                        <LikeOutlined /> {item.likeCount ?? 0}
                                                    </span>
                                                    <span className="flex items-center gap-1 hover:text-gray-600">
                                                        <HeartOutlined /> {item.favoriteCount ?? 0}
                                                    </span>
                                                </div>
                                                <span className="flex items-center gap-1 hover:text-gray-600">
                                                    <MessageOutlined /> {item.commentCount ?? 0}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    /* 粉丝列表：去除外边框，无内部背景，只保留底边框与页面背景一致 */
                    <div className="mb-8">
                        {mockFansList.length === 0 ? (
                            <div className="py-16 text-center">
                                <Empty description="暂时还没有粉丝" />
                            </div>
                        ) : (
                            <div>
                                {mockFansList.map((fan) => {
                                    const isFanFollowed = followedFanIds.includes(fan.id);

                                    return (
                                        <div
                                            key={fan.id}
                                            className="group flex items-center gap-3 py-4 border-b border-[#964328]/15 transition-colors hover:bg-black/5 sm:gap-4 px-2"
                                        >
                                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-[#C7A16A]/50 bg-[#F5EBDD] p-0.5 shadow-sm sm:h-14 sm:w-14">
                                                <img
                                                    src={fan.avatar}
                                                    alt={fan.name}
                                                    className="h-full w-full rounded-full object-cover"
                                                />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="truncate text-sm font-bold text-[#3F332A] transition-colors group-hover:text-[#964328]">
                                                        {fan.name}
                                                    </h3>
                                                    <span className="rounded border border-[#C7A16A]/30 bg-[#F8F0E2] px-1.5 py-0.5 text-[10px] text-[#9A7440]">
                                                        书友
                                                    </span>
                                                </div>
                                                <p className="mt-1 truncate text-xs leading-relaxed text-[#8B8178] sm:text-sm">
                                                    {fan.bio}
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleFanFollowToggle(fan.id)}
                                                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition-all sm:px-4 sm:text-sm ${
                                                    isFanFollowed
                                                        ? "border-[#964328]/20 bg-[#F4E8DA] text-[#8C6049] hover:bg-[#EBDAC6]"
                                                        : "border-[#964328] bg-[#964328] text-[#FFF8ED] hover:bg-[#7E3720]"
                                                }`}
                                            >
                                                {isFanFollowed ? "已回关" : "回关"}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* 4. 书法家详情抽屉组件 */}
            <CalligrapherDetailDrawer
                open={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                id={id}
            />
        </div>
    );
};

export default ArticleWorks;