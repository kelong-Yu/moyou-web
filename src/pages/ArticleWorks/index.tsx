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
import { Spin, Empty, message, Avatar } from "antd";
import { useSelector } from "react-redux";
import type { RootState } from "../../stores";
import {
    getCalligrapherWorks,
    getCalligrapherFollowStatus,
    followCalligrapher,
    unfollowCalligrapher,
    getCalligrapherFollowers,
} from "../../services/calligrapher/api";
import { followUser, unfollowUser } from "../../services/user/api";
import MoyouLoading from "../../components/MoyouLoading";
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
    const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
    const [activeMainTab, setActiveMainTab] = useState<MainTabType>("works");
    const [activeTab, setActiveTab] = useState<TabType>("all");

    // 当前登录用户（关注操作需要登录）
    const userInfo = useSelector((state: RootState) => state.user.userInfo);

    // 书法家关注状态与真实粉丝数（数据库统计）
    const [followStatus, setFollowStatus] = useState<API.CalligrapherFollowStatus>();
    const [followStatusLoading, setFollowStatusLoading] = useState<boolean>(true);
    const [followSubmitting, setFollowSubmitting] = useState<boolean>(false);

    // 书法家真实粉丝列表
    const [fansList, setFansList] = useState<API.UserProfileCard[]>([]);
    const [fansLoading, setFansLoading] = useState<boolean>(false);
    const [fansError, setFansError] = useState<boolean>(false);

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

    // 加载书法家关注状态与真实粉丝数
    useEffect(() => {
        if (!id) return;

        let cancelled = false;
        setFollowStatusLoading(true);

        getCalligrapherFollowStatus(Number(id))
            .then((res: any) => {
                if (cancelled) return;
                if (res.code === 200) {
                    setFollowStatus(res.data);
                }
            })
            .finally(() => {
                if (!cancelled) setFollowStatusLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [id]);

    // 加载书法家真实粉丝列表（进入粉丝 Tab 时）
    useEffect(() => {
        if (!id || activeMainTab !== "fans") return;

        let cancelled = false;
        setFansLoading(true);
        setFansError(false);

        getCalligrapherFollowers(Number(id))
            .then((res: any) => {
                if (cancelled) return;
                if (res.code === 200) {
                    setFansList(res.data || []);
                } else {
                    setFansError(true);
                }
            })
            .catch(() => {
                if (!cancelled) setFansError(true);
            })
            .finally(() => {
                if (!cancelled) setFansLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [id, activeMainTab]);

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

    /** 未登录时统一引导登录（沿用项目现有方式） */
    const requireLogin = () => {
        message.info("请先登录");
        navigate("/login");
    };

    /**
     * 关注 / 取消关注书法家（真实接口）
     *
     * 成功后重新拉取服务端状态：按钮与粉丝数以数据库为准。
     */
    const handleFollowToggle = () => {
        if (!id) return;
        if (!userInfo) {
            requireLogin();
            return;
        }
        if (followSubmitting) return;

        setFollowSubmitting(true);
        const wasFollowed = followStatus?.followed;

        (
            wasFollowed
                ? unfollowCalligrapher(Number(id))
                : followCalligrapher(Number(id))
        )
            .then((res: any) => {
                if (res.code === 200) {
                    // 服务端确认成功后，重新查询真实状态与粉丝数
                    return getCalligrapherFollowStatus(Number(id)).then(
                        (statusRes: any) => {
                            if (statusRes.code === 200) {
                                setFollowStatus(statusRes.data);
                            }
                        }
                    );
                }
                if (res.code === 4001) {
                    requireLogin();
                } else {
                    message.error(res.message || "操作失败，请稍后重试");
                }
            })
            .catch(() => {
                message.error("操作失败，请稍后重试");
            })
            .finally(() => {
                setFollowSubmitting(false);
            });
    };

    /**
     * 粉丝列表行内的关注 / 取消关注
     *
     * 这是针对粉丝用户的"用户关注"操作（user_follow），
     * 调用真实用户关注接口，成功后仅更新该行状态。
     */
    const handleFanFollowToggle = (fan: API.UserProfileCard) => {
        if (!userInfo) {
            requireLogin();
            return;
        }
        if (followSubmitting) return;

        setFollowSubmitting(true);

        (
            fan.followed
                ? unfollowUser(fan.id)
                : followUser(fan.id)
        )
            .then((res: any) => {
                if (res.code === 200) {
                    setFansList((prev) =>
                        prev.map((item) =>
                            item.id === fan.id
                                ? { ...item, followed: !item.followed }
                                : item
                        )
                    );
                } else if (res.code === 4001) {
                    requireLogin();
                } else {
                    message.error(res.message || "操作失败，请稍后重试");
                }
            })
            .catch(() => {
                message.error("操作失败，请稍后重试");
            })
            .finally(() => {
                setFollowSubmitting(false);
            });
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
                                                <span className="font-semibold text-white">
                                                    {followStatus?.followerCount ?? 0}
                                                </span>
                                            </button>

                                            <span className="w-px h-3 bg-gray-600/80 my-auto" />

                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xs text-gray-400">获赞</span>
                                                <span className="font-semibold text-white">
                                                    {totalLikes || 0}
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
                                        disabled={followSubmitting || followStatusLoading}
                                        className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                                            followStatus?.followed
                                                ? "bg-white/15 text-gray-200 hover:bg-white/20 border border-white/20"
                                                : "bg-[#964328] hover:bg-[#7e3720] text-amber-50 border border-amber-500/30 shadow-md active:scale-95"
                                        }`}
                                    >
                                        {followStatus?.followed ? (
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
                    /* 粉丝列表：真实关注该书法家的用户（无外框、底部分隔线与页面背景一致） */
                    <div className="mb-8">
                        {fansLoading ? (
                            <div className="h-64">
                                <MoyouLoading tip="正在加载粉丝列表……" />
                            </div>
                        ) : fansError ? (
                            <div className="py-16 text-center">
                                <Empty description="粉丝列表加载失败，请稍后重试" />
                            </div>
                        ) : fansList.length === 0 ? (
                            <div className="py-16 text-center">
                                <Empty description="暂时还没有粉丝" />
                            </div>
                        ) : (
                            <div className="px-2">
                                {fansList.map((fan) => (
                                    <div
                                        key={fan.id}
                                        className="group flex items-center gap-3 py-4 border-b border-[#964328]/15 transition-colors hover:bg-black/5 sm:gap-4 px-2"
                                    >
                                        <Avatar
                                            size={52}
                                            src={fan.avatarUrl || undefined}
                                            onClick={() => navigate(`/user/${fan.id}`)}
                                            className="!bg-[#FBEDE8] !text-[#6F3220] shrink-0 font-semibold cursor-pointer border border-[#C7A16A]/50 shadow-sm"
                                        >
                                            {(fan.username || fan.userAccount || "?")[0]?.toUpperCase()}
                                        </Avatar>

                                        <div
                                            className="min-w-0 flex-1 cursor-pointer"
                                            onClick={() => navigate(`/user/${fan.id}`)}
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="truncate text-sm font-bold text-[#3F332A] transition-colors group-hover:text-[#964328]">
                                                    {fan.username || fan.userAccount || "墨友"}
                                                </h3>
                                                {fan.role === 1 || fan.role === 2 ? (
                                                    <span className="rounded border border-[#C7A16A]/30 bg-[#F8F0E2] px-1.5 py-0.5 text-[10px] text-[#9A7440]">
                                                        {fan.role === 1 ? "管理员" : "VIP 会员"}
                                                    </span>
                                                ) : (
                                                    <span className="rounded border border-[#C7A16A]/30 bg-[#F8F0E2] px-1.5 py-0.5 text-[10px] text-[#9A7440]">
                                                        书友
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 truncate text-xs leading-relaxed text-[#8B8178] sm:text-sm">
                                                @{fan.userAccount || "未知账号"}
                                            </p>
                                        </div>

                                        {/* 粉丝行操作：自己所在行不显示按钮；书法家粉丝列表未关注显示"关注" */}
                                        {!(userInfo && fan.id === userInfo.id) && (
                                            <button
                                                type="button"
                                                disabled={followSubmitting}
                                                onClick={() => handleFanFollowToggle(fan)}
                                                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition-all sm:px-4 sm:text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                                                    fan.followed
                                                        ? "border-[#964328]/20 bg-[#F4E8DA] text-[#8C6049] hover:bg-[#EBDAC6]"
                                                        : "border-[#964328] bg-[#964328] text-[#FFF8ED] hover:bg-[#7E3720]"
                                                }`}
                                            >
                                                {fan.followed ? "已关注" : "关注"}
                                            </button>
                                        )}
                                    </div>
                                ))}
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