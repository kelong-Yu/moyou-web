import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { App, Button, Empty } from "antd";
import {
    EyeOutlined,
    HeartOutlined,
    MessageOutlined,
    UserOutlined,
    TeamOutlined,
    EditOutlined,
    PlusOutlined,
    CheckOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../stores";
import { setUserInfo } from "../../stores/slices/userSlice";
import {
    currentUser,
    getUserProfile,
    getUserFollowingPage,
    getUserFollowersPage,
    followUser,
    unfollowUser,
} from "../../services/user/api";
import { getMyFavoriteCopybooks, getMyFavoriteCharacters } from "../../services/copybook/api";
import { unfollowCalligrapher } from "../../services/calligrapher/api";
import MoyouLoading from "../../components/MoyouLoading";
import UserAvatar from "../../components/UserAvatar";
import { usePageMeta } from "../../hooks/usePageMeta";
import CharacterFavoriteCard from "./components/CharacterFavoriteCard";
import TabSearchBar from "./components/TabSearchBar";
import FollowListPanel from "./components/FollowListPanel";
import useFollowPagedList from "./hooks/useFollowPagedList";
import bgImg from "../../assets/lantingxu.jpg";

/** 一级导航 */
type MainTab = "favorites" | "following" | "fans";

/** 收藏二级导航 */
type FavSubTab = "copybook" | "character";

/**
 * 关注 / 粉丝分页每页条数。
 *
 * 后端默认 20、上限 50，这里取 7：列表是带头像的两行卡片，
 * 一屏大约放 7 条，再多就要滚很久才能看到分页器。
 */
const FOLLOW_PAGE_SIZE = 7;

/**
 * 个人主页 Hero 使用的资料视图
 *
 * `signature`（个人简介）在 user_info 表与 UserInfoResponse（currentUser）中都有，
 * 但公开资料接口 /api/web/user/{id}/profile 返回的是 UserProfileResponse，
 * 该 DTO 目前尚未携带 signature。这里以可选字段声明，后端补字段后无需改前端即自动生效；
 * 查看本人主页时回退到 Redux 里的 currentUser.signature，保证本人简介当前就能显示。
 *
 * 刻意不改 src/services/user/typings.d.ts，避免与并行任务冲突。
 */
type ProfileView = API.UserProfile & {
    signature?: string;
    ipLocation?: string;
};

const MAIN_TABS: { key: MainTab; label: string; icon: React.ReactNode }[] = [
    { key: "favorites", label: "收藏", icon: <HeartOutlined /> },
    { key: "following", label: "关注", icon: <UserOutlined /> },
    { key: "fans", label: "粉丝", icon: <TeamOutlined /> },
];

/**
 * 任一字段命中关键字即算匹配
 *
 * 关键字为空（未搜索）时全部通过，等价于不过滤。
 */
const matchesKeyword = (
    normalizedKeyword: string,
    ...fields: (string | undefined)[]
) => {
    if (!normalizedKeyword) return true;
    return fields.some((field) =>
        (field || "").toLowerCase().includes(normalizedKeyword)
    );
};

/** 搜索框占位文案：随一级导航（及收藏二级导航）变化 */
const SEARCH_PLACEHOLDERS: Record<MainTab, string> = {
    favorites: "搜索碑帖 / 单字名称",
    following: "搜索关注名称",
    fans: "搜索粉丝名称",
};

/* =========================================================
   搜索与分页的叠加语义（关注 / 粉丝）—— 重要取舍，勿随手改

   1. 关注 / 粉丝的关键字**下发到后端**（分页接口的 keyword 参数），
      过滤在 SQL 层完成，所以搜的是全部关注/粉丝，不只是当前页；
      关键字变化时页码归 1，由 useFollowPagedList.search 负责。
   2. 收藏 tab 的接口本身没有分页、数据全量在本地，
      仍走前端过滤，不受上面这套影响。
   3. 因此 total 现在是"命中总数"而非"全部总数"，
      分页器与「共 N 条」文案都直接采用服务端返回值。
   ========================================================= */

/**
 * 用户个人主页
 *
 * /profile       查看当前登录用户
 * /user/:id      查看其他用户（公开资料 + 关注体系）
 *
 * 视觉与布局复用书法家主页 ArticleWorks：
 * 深色书法背景资料区 + 米白页面 + 赭红主题一级导航。
 *
 * 本人 / 他人一律以用户 ID 数值比较判断。
 */
const UserProfile = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { message } = App.useApp();
    const dispatch = useDispatch();

    // 当前登录用户（Redux，由 AuthProvider 初始化）
    const userInfo = useSelector((state: RootState) => state.user.userInfo);

    const routeUserId =
        id && !Number.isNaN(Number(id)) ? Number(id) : undefined;

    // /profile 且 Redux 尚未就绪时，需要先确认登录身份
    const [authChecking, setAuthChecking] = useState(!routeUserId);

    // ==================== 数据状态 ====================
    /** 正在查看的用户资料（本人/他人共用公开资料接口） */
    const [profile, setProfile] = useState<ProfileView>();
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileError, setProfileError] = useState<string>();

    /** 碑帖收藏列表 */
    const [favorites, setFavorites] = useState<API.WebCopybookResponse[]>([]);
    const [favoritesLoading, setFavoritesLoading] = useState(false);
    const [favoritesError, setFavoritesError] = useState(false);

    /** 单字收藏列表 */
    const [favCharacters, setFavCharacters] = useState<
        API.CharacterFavoriteItem[]
    >([]);
    const [favCharactersLoading, setFavCharactersLoading] = useState(false);
    const [favCharactersError, setFavCharactersError] = useState(false);

    /**
     * 关注列表（合并：关注的用户 + 关注的书法家），服务端分页
     * 粉丝列表，服务端分页
     *
     * 两个列表分页逻辑相同但 records 元素类型不同
     * （FollowingItemResponse / UserProfileCardResponse），
     * 因此各持一个实例，泛型参数把类型带到列表行渲染上。
     */
    const followingList = useFollowPagedList<API.FollowingItem>({
        pageSize: FOLLOW_PAGE_SIZE,
        fetchPage: getUserFollowingPage,
    });

    const fansList = useFollowPagedList<API.UserProfileCard>({
        pageSize: FOLLOW_PAGE_SIZE,
        fetchPage: getUserFollowersPage,
    });

    // ==================== 交互状态 ====================
    const [activeTab, setActiveTab] = useState<MainTab>("favorites");
    const [favSubTab, setFavSubTab] = useState<FavSubTab>("copybook");

    /** 关注 / 取消关注请求进行中，防止重复提交 */
    const [followSubmitting, setFollowSubmitting] = useState(false);

    /**
     * 当前 tab 的搜索关键字
     *
     * 关注 / 粉丝 tab：变化时下发给后端重查（服务端过滤，页码归 1）。
     * 收藏 tab：只做本地过滤，因为该接口没有分页、数据全量在前端。
     * 切换一级导航时重置（见 TabSearchBar 的 resetKey）。
     */
    const [keyword, setKeyword] = useState("");

    /**
     * 搜索清空计数器
     *
     * 与 activeTab 拼成 TabSearchBar 的 resetKey：
     * 递增即可让搜索框自身（持有输入值）一并清空，无需把它改成受控组件。
     */
    const [searchClearToken, setSearchClearToken] = useState(0);

    // ==================== 派生数据 ====================
    /** 正在查看的目标用户：路由 ID 优先，否则为当前登录用户 */
    const targetUserId = routeUserId ?? userInfo?.id ?? undefined;

    /** 是否本人主页：以用户 ID 数值比较判断 */
    const isSelf =
        userInfo != null &&
        targetUserId != null &&
        Number(userInfo.id) === targetUserId;

    // ==================== 登录身份确认 ====================
    useEffect(() => {
        // 他人主页游客可看，无需等待本人身份
        if (routeUserId || userInfo) {
            setAuthChecking(false);
            return;
        }

        let cancelled = false;

        currentUser()
            .then((res: any) => {
                if (cancelled) return;
                if (res.code === 200) {
                    dispatch(setUserInfo(res.data));
                }
            })
            .finally(() => {
                if (!cancelled) setAuthChecking(false);
            });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ==================== 数据加载 ====================

    /**
     * 加载正在查看的用户资料
     *
     * 切换用户 ID 时先清空旧数据，避免短暂显示上一个用户的内容。
     */
    const loadProfile = (userId: number) => {
        setProfile(undefined);
        setProfileLoading(true);
        setProfileError(undefined);

        getUserProfile(userId)
            .then((res: any) => {
                if (res.code === 200) {
                    setProfile(res.data);
                } else {
                    setProfileError(res.message || "用户资料加载失败");
                }
            })
            .catch(() => {
                setProfileError("用户资料加载失败，请稍后重试");
            })
            .finally(() => {
                setProfileLoading(false);
            });
    };

    useEffect(() => {
        if (targetUserId == null) {
            setProfileLoading(false);
            return;
        }
        loadProfile(targetUserId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetUserId]);

    // 加载碑帖收藏列表（仅本人主页；收藏接口为"我的收藏"）
    useEffect(() => {
        if (!userInfo || !isSelf) return;
        if (activeTab !== "favorites" || favSubTab !== "copybook") return;

        let cancelled = false;
        setFavoritesLoading(true);
        setFavoritesError(false);

        getMyFavoriteCopybooks()
            .then((res: any) => {
                if (cancelled) return;
                if (res.code === 200) {
                    setFavorites(res.data || []);
                } else if (res.code === 4001) {
                    message.info("请先登录");
                    navigate("/login");
                } else {
                    setFavoritesError(true);
                }
            })
            .catch(() => {
                if (!cancelled) setFavoritesError(true);
            })
            .finally(() => {
                if (!cancelled) setFavoritesLoading(false);
            });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userInfo, isSelf, activeTab, favSubTab]);

    // 加载单字收藏列表（仅本人主页；进入"单字收藏"二级导航时）
    useEffect(() => {
        if (!userInfo || !isSelf) return;
        if (activeTab !== "favorites" || favSubTab !== "character") return;

        let cancelled = false;
        setFavCharactersLoading(true);
        setFavCharactersError(false);

        getMyFavoriteCharacters()
            .then((res: any) => {
                if (cancelled) return;
                if (res.code === 200) {
                    setFavCharacters(res.data || []);
                } else if (res.code === 4001) {
                    message.info("请先登录");
                    navigate("/login");
                } else {
                    setFavCharactersError(true);
                }
            })
            .catch(() => {
                if (!cancelled) setFavCharactersError(true);
            })
            .finally(() => {
                if (!cancelled) setFavCharactersLoading(false);
            });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userInfo, isSelf, activeTab, favSubTab]);

    /**
     * 进入关注 / 粉丝 tab 时拉取第一页
     *
     * 每次进入都重新请求：关注关系可能在别处变更（Hero 按钮、对方主页），
     * 以服务端为准，不做"已加载就跳过"的缓存。
     * 加载中由 FollowListPanel 显示占位，不会白屏。
     */
    useEffect(() => {
        if (targetUserId == null) return;

        if (activeTab === "following") followingList.load(targetUserId, 1);
        if (activeTab === "fans") fansList.load(targetUserId, 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, targetUserId]);

    // ==================== 派生数据与工具 ====================

    /** 昵称 / 姓名回退到账号 */
    const displayName =
        profile?.username || profile?.userAccount || "墨友";

    // 页面标题 + 浏览历史：取得真实用户名后才设置并上报
    usePageMeta({
        title: profile ? `${displayName} · 个人主页` : "",
        pageType: "user",
        targetId: profile?.id ?? routeUserId,
        ready: !!profile,
    });

    /** 性别展示：1-男 2-女，其余按未设置处理 */
    const genderText =
        profile?.gender === 1
            ? "男"
            : profile?.gender === 2
            ? "女"
            : "未设置";

    /**
     * IP 属地（省级）
     *
     * 后端在登录时写入 user_info.ip_location，粒度只到省，不含城市。
     * 内网或本机登录不会产生属地，此时保持占位。
     */
    const locationText = profile?.ipLocation?.trim() || "未设置";

    /**
     * 个人简介
     *
     * 优先取公开资料接口返回的 signature；查看本人时该接口尚未返回此字段，
     * 回退到 Redux 中 currentUser 的 signature。两者都为空时才由渲染层显示占位文案。
     */
    const signatureText = (
        profile?.signature ?? (isSelf ? userInfo?.signature : undefined)
    )?.trim();

    /** 加入时间：仅保留日期 */
    const joinTimeText = profile?.createTime
        ? String(profile.createTime).slice(0, 10)
        : "未设置";

    // ==================== 当前 tab 的搜索 ====================
    // 收藏：接口未分页，全量在本地 → 前端过滤
    // 关注 / 粉丝：接口分页 → 关键字下发后端，服务端过滤，records 已是命中结果

    /** 归一化关键字（小写比较，中文子串匹配） */
    const normalizedKeyword = keyword.trim().toLowerCase();

    /** 是否处于搜索状态（决定空列表文案） */
    const isSearching = normalizedKeyword.length > 0;

    /** 碑帖收藏：按碑帖名称过滤 */
    const filteredFavorites = useMemo(
        () =>
            favorites.filter((item) => matchesKeyword(normalizedKeyword, item.name)),
        [favorites, normalizedKeyword]
    );

    /** 单字收藏：按单字名称过滤，兼顾卡片上同排展示的碑帖名 */
    const filteredCharacters = useMemo(
        () =>
            favCharacters.filter((item) =>
                matchesKeyword(normalizedKeyword, item.characterText, item.copybookName)
            ),
        [favCharacters, normalizedKeyword]
    );

    /** 关注列表：服务端已按 keyword 过滤，这里不再二次筛选 */
    const visibleFollowing = followingList.records;

    /** 粉丝列表：同上 */
    const visibleFans = fansList.records;

    /** 搜索无结果时的统一文案（收藏：全量列表内没找到） */
    const emptySearchDescription = "没有匹配的结果，换个关键词试试";

    /**
     * 分页列表搜索无结果
     *
     * 关键字已下发后端，所以"没找到"就是全部关注/粉丝里都没有，
     * 措辞不能再暗示范围受限。
     */
    const followSearchEmptyDescription = (label: string) =>
        `没有找到名称包含「${keyword.trim()}」的${label}，换个关键词试试，或清除搜索查看全部。`;

    const followingSearchEmptyDescription = followSearchEmptyDescription("关注");

    const fansSearchEmptyDescription = followSearchEmptyDescription("粉丝");

    /**
     * 关键字变化
     *
     * TabSearchBar 内部已做防抖，这里直接下发即可。
     * 收藏 tab 的数据全量在本地，无需请求。
     */
    const handleKeywordChange = (next: string) => {
        setKeyword(next);

        if (activeTab === "following") {
            followingList.search(next);
        } else if (activeTab === "fans") {
            fansList.search(next);
        }
    };

    /**
     * 清除搜索
     *
     * TabSearchBar 自持输入值，仅靠 resetKey 变化才会清空，
     * 因此这里同时递增 token 并把 resetKey 设为 "tab:token"，
     * 让输入框与父组件关键字一起归零。
     * 两个分页列表的服务端关键字都要清，否则切回该 tab 时
     * 界面显示空输入框、请求却仍带着旧 keyword。
     */
    const clearKeyword = () => {
        setKeyword("");
        setSearchClearToken((token) => token + 1);
        followingList.search("");
        fansList.search("");
    };

    /**
     * 切换一级导航
     *
     * 换 tab 即换搜索范围：输入框、父组件 keyword、两个列表的服务端
     * keywordRef 都要归零。只清前两者的话，切走再切回来会拿上一次
     * 的关键字去请求一个显示为空搜索框的列表。
     *
     * 用事件回调而不是 effect 处理，是为了让清空发生在
     * "进入 tab 自动加载"那个 effect 之前，避免两次请求抢同一份状态。
     */
    const switchMainTab = (tab: MainTab) => {
        if (tab !== activeTab) {
            setKeyword("");
            setSearchClearToken((token) => token + 1);
            followingList.search("");
            fansList.search("");
        }

        setActiveTab(tab);
    };

    // ==================== 交互处理 ====================

    /** 编辑信息入口：跳转个人中心-基本资料页（当前窗口） */
    const handleEditProfile = () => {
        navigate("/settings/profile");
    };

    /** 未登录时统一引导登录 */
    const requireLogin = () => {
        message.info("请先登录");
        navigate("/login");
    };

    /**
     * Hero 区关注 / 取消关注（仅他人主页）
     *
     * 成功后重新拉取资料：按钮状态与关注数、粉丝数以数据库为准。
     */
    const handleFollowToggle = async () => {
        if (!userInfo) {
            requireLogin();
            return;
        }
        if (isSelf || targetUserId == null || followSubmitting) return;

        setFollowSubmitting(true);

        try {
            const res: any = profile?.followed
                ? await unfollowUser(targetUserId)
                : await followUser(targetUserId);

            if (res.code === 200) {
                // 服务端成功后才更新状态
                await loadProfile(targetUserId);
                if (activeTab === "following") followingList.refresh();
                if (activeTab === "fans") fansList.refresh();
            } else if (res.code === 4001) {
                requireLogin();
            } else {
                message.error(res.message || "操作失败，请稍后重试");
            }
        } catch {
            message.error("操作失败，请稍后重试");
        } finally {
            setFollowSubmitting(false);
        }
    };

    /**
     * 列表行内的关注 / 取消关注（回关）
     *
     * 仅更新该行 followed 并刷新资料统计，不做本地假成功。
     */
    const handleListFollowToggle = async (user: API.UserProfileCard) => {
        if (!userInfo) {
            requireLogin();
            return;
        }
        if (followSubmitting) return;

        setFollowSubmitting(true);

        try {
            const res: any = user.followed
                ? await unfollowUser(user.id)
                : await followUser(user.id);

            if (res.code === 200) {
                const flip = (list: API.UserProfileCard[]) =>
                    list.map((item) =>
                        item.id === user.id
                            ? { ...item, followed: !item.followed }
                            : item
                    );

                // 该处理函数仅服务粉丝列表（UserProfileCard）；
                // 关注列表已合并为 FollowingItem，取消走 handleUnfollowFollowing
                // 回关不改变列表成员，就地翻转即可，不必重新请求当前页
                fansList.patchRecords(flip);

                // 关注数以数据库为准，重新拉取资料统计
                if (targetUserId != null) loadProfile(targetUserId);
            } else if (res.code === 4001) {
                requireLogin();
            } else {
                message.error(res.message || "操作失败，请稍后重试");
            }
        } catch {
            message.error("操作失败，请稍后重试");
        } finally {
            setFollowSubmitting(false);
        }
    };

    /**
     * 关注列表行内取消关注
     *
     * 按条目类型调用对应取关接口（用户 / 书法家），
     * 成功后重查当前页并重拉资料统计。
     *
     * 分页下不再本地删行：取关后该页应由后端的下一页补位，
     * 本地过滤会让总条数与页内容同时失真。refresh 不清列表，
     * 因此不会出现"整块闪成 loading"的观感。
     */
    const handleUnfollowFollowing = async (item: API.FollowingItem) => {
        if (!userInfo) {
            requireLogin();
            return;
        }
        if (followSubmitting) return;

        setFollowSubmitting(true);

        try {
            const res: any =
                item.type === "user"
                    ? await unfollowUser(item.targetId)
                    : await unfollowCalligrapher(item.targetId);

            if (res.code === 200) {
                followingList.refresh();

                // 关注数以数据库为准，重新拉取资料统计
                if (targetUserId != null) loadProfile(targetUserId);
            } else if (res.code === 4001) {
                requireLogin();
            } else {
                message.error(res.message || "操作失败，请稍后重试");
            }
        } catch {
            message.error("操作失败，请稍后重试");
        } finally {
            setFollowSubmitting(false);
        }
    };

    /** 渲染小号身份标签（列表行使用，与 UserDropdown 风格一致） */
    const renderMiniRoleTag = (role?: number) => {
        if (role === 1 || role === 2) {
            return (
                <span className="inline-flex items-center gap-1 rounded border border-[#E6C594]/50 bg-gradient-to-r from-[#211E1B] to-[#181614] px-1.5 py-[1px] text-[10px] font-semibold">
                    <svg
                        className="h-2.5 w-2.5 shrink-0 text-[#FFD700]"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                    >
                        <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
                    </svg>
                    <span className="bg-gradient-to-r from-[#FFE5B4] to-[#E6A15C] bg-clip-text font-bold text-transparent">
                        {role === 1 ? "管理员" : "VIP 会员"}
                    </span>
                </span>
            );
        }
        return (
            <span className="rounded border border-[#964328]/15 bg-[#F8F0E2] px-1.5 py-[1px] text-[10px] text-[#9A7440]">
                普通用户
            </span>
        );
    };

    // ==================== 渲染 ====================

    // 未登录访问 /profile：不展示任何伪造信息
    if (!userInfo && !routeUserId && !authChecking) {
        return (
            <div className="min-h-screen bg-[#FAF6ED] font-serif pt-32 text-center">
                <Empty description="登录后才能查看个人主页" />
                <Button
                    type="primary"
                    className="mt-6 bg-[#964328]"
                    onClick={() => navigate("/login")}
                >
                    去登录
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAF6ED] font-serif text-gray-800 pb-16 select-none">
            {/* ==================== 顶部用户资料区（复用 ArticleWorks 深色 Hero） ==================== */}
            <div className="relative overflow-hidden bg-[#121110] text-white pt-24 pb-12">
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity pointer-events-none"
                    style={{ backgroundImage: `url(${bgImg})` }}
                />
                <div className="absolute inset-0 bg-linear-to-r from-[#121110] via-[#121110]/80 to-transparent pointer-events-none" />

                <div className="relative z-10 max-w-310 mx-auto px-4 sm:px-6 lg:px-8">
                    {authChecking || profileLoading ? (
                        // 深色 Hero 使用 MoyouLoading 的 dark 变体：
                        // 卡其亮色笔画与文案，无米色底纸片
                        <div className="py-12 flex justify-center">
                            <div className="w-64 h-40">
                                <MoyouLoading
                                    dark
                                    tip="正在加载用户资料……"
                                />
                            </div>
                        </div>
                    ) : profileError ? (
                        <div className="py-12 text-center">
                            <Empty
                                description={profileError}
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        </div>
                    ) : profile ? (
                        <div className="space-y-5">
                            {/* 第一行：头像 + 姓名 + 身份标签 + 操作按钮 */}
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-5 sm:gap-6">
                                    <UserAvatar
                                        size={88}
                                        src={profile.avatarUrl}
                                        account={profile.userAccount}
                                        name={profile.username}
                                        className="shrink-0 font-semibold border-2 border-amber-500/40 shadow-xl"
                                    />

                                    <div className="flex flex-col items-start gap-2">
                                        <h1 className="text-2xl sm:text-3xl font-bold tracking-wide text-amber-50">
                                            {displayName}
                                        </h1>

                                        {/* 身份标签：与 UserDropdown 展示风格一致 */}
                                        {profile.role === 1 ||
                                        profile.role === 2 ? (
                                            <div className="relative overflow-hidden inline-flex items-center gap-1 px-1.5 py-[2px] rounded text-[10px] font-semibold bg-gradient-to-r from-[#211E1B] via-[#2D2823] to-[#181614] border border-[#E6C594]/40 shadow-xs">
                                                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                                <svg
                                                    className="w-2.5 h-2.5 text-[#FFD700] shrink-0"
                                                    viewBox="0 0 24 24"
                                                    fill="currentColor"
                                                >
                                                    <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
                                                </svg>
                                                <span className="bg-gradient-to-r from-[#FFE5B4] via-[#FFC870] to-[#E6A15C] bg-clip-text text-transparent font-bold tracking-wider relative z-10">
                                                    {profile.role === 1
                                                        ? "管理员"
                                                        : "VIP 会员"}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-[2px] rounded text-[10px] text-amber-100/80 border border-amber-200/20">
                                                普通用户
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* 操作按钮：本人编辑 / 他人真实关注 */}
                                {isSelf ? (
                                    <button
                                        type="button"
                                        onClick={handleEditProfile}
                                        className="shrink-0 px-5 py-2 rounded-full text-sm font-medium bg-[#964328] hover:bg-[#7e3720] text-amber-50 border border-amber-500/30 shadow-md active:scale-95 transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <EditOutlined className="text-xs" />
                                        编辑信息
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleFollowToggle}
                                        disabled={followSubmitting}
                                        className={`shrink-0 px-5 py-2 rounded-full text-sm font-medium active:scale-95 transition-all duration-200 flex items-center gap-1.5 cursor-pointer border disabled:opacity-60 disabled:cursor-not-allowed ${
                                            profile.followed
                                                ? "bg-white/15 text-gray-200 hover:bg-white/20 border-white/20"
                                                : "bg-[#964328] hover:bg-[#7e3720] text-amber-50 border-amber-500/30 shadow-md"
                                        }`}
                                    >
                                        {profile.followed ? (
                                            <>
                                                <CheckOutlined className="text-xs" />
                                                已关注
                                            </>
                                        ) : (
                                            <>
                                                <PlusOutlined className="text-xs" />
                                                关注
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* 第二行：个人简介 */}
                            <p className="text-xs sm:text-sm text-gray-300/90 leading-relaxed line-clamp-2">
                                {signatureText || "暂无个人简介"}
                            </p>

                            {/* 第三行：基本信息（性别 | 位置 | 加入时间） */}
                            <div className="flex items-center gap-3 text-xs text-gray-300/90">
                                <span>{genderText}</span>
                                <span className="w-px h-3 bg-gray-600/80" />
                                <span>{locationText}</span>
                                <span className="w-px h-3 bg-gray-600/80" />
                                <span>{joinTimeText}</span>
                            </div>

                            {/* 用户数据统计（关注 / 粉丝为真实数据库统计，可点击切换导航） */}
                            <div className="flex items-center gap-6 pt-2 border-t border-white/10 text-xs">
                                <div
                                    className="flex items-baseline gap-1"
                                    title="该统计项待后端支持"
                                >
                                    <span className="text-gray-400">获赞</span>
                                    <span className="font-semibold text-white">
                                        0
                                    </span>
                                </div>
                                <div
                                    className="flex items-baseline gap-1"
                                    title="该统计项待后端支持"
                                >
                                    <span className="text-gray-400">浏览</span>
                                    <span className="font-semibold text-white">
                                        0
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => switchMainTab("following")}
                                    className="flex items-baseline gap-1 bg-transparent border-0 p-0 cursor-pointer hover:text-amber-300 transition-colors"
                                >
                                    <span className="text-gray-400">关注</span>
                                    <span className="font-semibold text-white">
                                        {profile.followingCount ?? 0}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => switchMainTab("fans")}
                                    className="flex items-baseline gap-1 bg-transparent border-0 p-0 cursor-pointer hover:text-amber-300 transition-colors"
                                >
                                    <span className="text-gray-400">粉丝</span>
                                    <span className="font-semibold text-white">
                                        {profile.followerCount ?? 0}
                                    </span>
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* ==================== 下方内容区 ==================== */}
            <main className="max-w-310 mx-auto px-4 sm:px-6 lg:px-8 pt-4">
                {/* 一级导航：收藏 / 关注 / 粉丝（同一行最右侧为搜索框） */}
                <div className="border-b border-[#964328]/15 mb-5">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-8 sm:gap-10">
                            {MAIN_TABS.map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => switchMainTab(tab.key)}
                                    className={`relative flex items-center gap-2 py-4 text-base transition-colors cursor-pointer ${
                                        activeTab === tab.key
                                            ? "font-bold text-[#964328]"
                                            : "text-[#756B61] hover:text-[#964328]"
                                    }`}
                                >
                                    {tab.icon}
                                    <span>{tab.label}</span>
                                    {activeTab === tab.key && (
                                        <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#964328]" />
                                    )}
                                </button>
                            ))}
                        </div>

                        <TabSearchBar
                            resetKey={`${activeTab}:${searchClearToken}`}
                            placeholder={SEARCH_PLACEHOLDERS[activeTab]}
                            onKeywordChange={handleKeywordChange}
                        />
                    </div>
                </div>

                {/* 内容区：切换时淡入 */}
                <div key={activeTab} className="profile-fade-in">
                    {/* ---------- 收藏 ---------- */}
                    {activeTab === "favorites" && (
                        <>
                            {/* 二级切换：碑帖收藏 / 单字收藏 */}
                            <div className="flex items-center gap-2 mb-6">
                                {(
                                    [
                                        { key: "copybook", label: "碑帖收藏" },
                                        { key: "character", label: "单字收藏" },
                                    ] as const
                                ).map((sub) => (
                                    <button
                                        key={sub.key}
                                        type="button"
                                        onClick={() => setFavSubTab(sub.key)}
                                        className={`px-4 py-1.5 rounded-full text-sm transition-all cursor-pointer border ${
                                            favSubTab === sub.key
                                                ? "bg-[#964328] text-[#FFF8ED] border-[#964328] shadow-sm"
                                                : "bg-white/65 text-[#756B61] border-[#964328]/15 hover:border-[#964328]/40 hover:text-[#964328]"
                                        }`}
                                    >
                                        {sub.label}
                                    </button>
                                ))}
                            </div>

                            {favSubTab === "copybook" ? (
                                /* ---------- 碑帖收藏列表 ---------- */
                                !isSelf ? (
                                    <div className="py-16 text-center">
                                        <Empty description="查看其他用户的收藏待后端支持" />
                                    </div>
                                ) : favoritesLoading ? (
                                    <div className="h-64">
                                        <MoyouLoading tip="正在加载收藏……" />
                                    </div>
                                ) : favoritesError ? (
                                    <div className="py-16 text-center">
                                        <Empty description="收藏列表加载失败，请稍后重试" />
                                    </div>
                                ) : filteredFavorites.length === 0 ? (
                                    <div className="py-16 text-center">
                                        <Empty
                                            description={
                                                isSearching
                                                    ? emptySearchDescription
                                                    : "暂无收藏内容"
                                            }
                                        />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                        {filteredFavorites.map((item) => (
                                            <div
                                                key={item.id}
                                                onClick={() =>
                                                    navigate(`/copybook/${item.id}`)
                                                }
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
                                                            <HeartOutlined className="text-3xl mb-1" />
                                                            <span className="text-xs">暂无图片</span>
                                                        </div>
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
                                                            <span className="flex items-center gap-1">
                                                                <EyeOutlined />
                                                                {item.viewCount ?? 0}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <HeartOutlined />
                                                                {item.favoriteCount ?? 0}
                                                            </span>
                                                        </div>
                                                        <span className="flex items-center gap-1">
                                                            <MessageOutlined />
                                                            {item.commentCount ?? 0}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                /* ---------- 单字收藏列表（按设计稿卡片展示） ---------- */
                                favCharactersLoading ? (
                                    <div className="h-64">
                                        <MoyouLoading tip="正在加载单字收藏……" />
                                    </div>
                                ) : favCharactersError ? (
                                    <div className="py-16 text-center">
                                        <Empty description="单字收藏加载失败，请稍后重试" />
                                    </div>
                                ) : filteredCharacters.length === 0 ? (
                                    <div className="py-16 text-center">
                                        <Empty
                                            description={
                                                isSearching
                                                    ? emptySearchDescription
                                                    : "暂无收藏的单字"
                                            }
                                        />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                        {filteredCharacters.map((item) => (
                                            <CharacterFavoriteCard
                                                key={item.characterId}
                                                item={item}
                                            />
                                        ))}
                                    </div>
                                )
                            )}
                        </>
                    )}

                    {/* ---------- 关注列表（合并：关注的用户 + 关注的书法家，服务端分页） ---------- */}
                    {activeTab === "following" && (
                        <FollowListPanel
                            loading={followingList.loading}
                            error={followingList.error}
                            degraded={followingList.degraded}
                            total={followingList.total}
                            pageNum={followingList.pageNum}
                            pageSize={followingList.pageSize}
                            searching={isSearching}
                            visibleCount={visibleFollowing.length}
                            loadingTip="正在加载关注列表……"
                            emptyDescription="暂无关注"
                            searchEmptyDescription={followingSearchEmptyDescription}
                            onPageChange={(page) =>
                                targetUserId != null &&
                                followingList.load(targetUserId, page)
                            }
                            onRetry={followingList.retry}
                            onClearSearch={clearKeyword}
                        >
                            {visibleFollowing.map((item) => {
                                const navigatePath =
                                    item.type === "user"
                                        ? `/user/${item.targetId}`
                                        : `/aritcleWorks/${item.targetId}`;

                                return (
                                    <div
                                        key={`${item.type}-${item.targetId}`}
                                        className="group flex items-center gap-3 py-4 border-b border-[#964328]/15 transition-colors hover:bg-black/5 sm:gap-4 px-2"
                                    >
                                        <UserAvatar
                                            size={48}
                                            src={item.avatarUrl}
                                            name={item.name}
                                            className="shrink-0 font-semibold cursor-pointer"
                                            onClick={() => navigate(navigatePath)}
                                        />

                                        <div
                                            className="min-w-0 flex-1 cursor-pointer"
                                            onClick={() => navigate(navigatePath)}
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="truncate text-sm font-bold text-[#3F332A] transition-colors group-hover:text-[#964328]">
                                                    {item.name || "墨友"}
                                                </h3>
                                                {item.type === "user" ? (
                                                    renderMiniRoleTag(item.role)
                                                ) : (
                                                    <span className="rounded border border-[#C7A16A]/30 bg-[#F8F0E2] px-1.5 py-0.5 text-[10px] text-[#9A7440]">
                                                        书法家
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 truncate text-xs leading-relaxed text-[#8B8178] sm:text-sm">
                                                {item.type === "user"
                                                    ? `@${item.subtitle || "未知账号"}`
                                                    : item.subtitle || ""}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            disabled={followSubmitting}
                                            onClick={() => handleUnfollowFollowing(item)}
                                            className="shrink-0 rounded-full border-[#964328]/20 bg-[#F4E8DA] px-3 py-1.5 text-xs text-[#8C6049] transition-all hover:bg-[#EBDAC6] sm:px-4 sm:text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border-0"
                                        >
                                            已关注
                                        </button>
                                    </div>
                                );
                            })}
                        </FollowListPanel>
                    )}

                    {/* ---------- 粉丝列表（服务端分页） ---------- */}
                    {activeTab === "fans" && (
                        <FollowListPanel
                            loading={fansList.loading}
                            error={fansList.error}
                            degraded={fansList.degraded}
                            total={fansList.total}
                            pageNum={fansList.pageNum}
                            pageSize={fansList.pageSize}
                            searching={isSearching}
                            visibleCount={visibleFans.length}
                            loadingTip="正在加载粉丝列表……"
                            emptyDescription="暂无粉丝"
                            searchEmptyDescription={fansSearchEmptyDescription}
                            onPageChange={(page) =>
                                targetUserId != null &&
                                fansList.load(targetUserId, page)
                            }
                            onRetry={fansList.retry}
                            onClearSearch={clearKeyword}
                        >
                            {visibleFans.map((user) => (
                                <div
                                    key={user.id}
                                    className="group flex items-center gap-3 py-4 border-b border-[#964328]/15 transition-colors hover:bg-black/5 sm:gap-4 px-2"
                                >
                                    <UserAvatar
                                        size={48}
                                        src={user.avatarUrl}
                                        account={user.userAccount}
                                        name={user.username}
                                        className="shrink-0 font-semibold cursor-pointer"
                                        onClick={() => navigate(`/user/${user.id}`)}
                                    />

                                    <div
                                        className="min-w-0 flex-1 cursor-pointer"
                                        onClick={() => navigate(`/user/${user.id}`)}
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="truncate text-sm font-bold text-[#3F332A] transition-colors group-hover:text-[#964328]">
                                                {user.username ||
                                                    user.userAccount ||
                                                    "墨友"}
                                            </h3>
                                            {renderMiniRoleTag(user.role)}
                                        </div>
                                        <p className="mt-1 truncate text-xs leading-relaxed text-[#8B8178] sm:text-sm">
                                            @{user.userAccount || "未知账号"}
                                        </p>
                                    </div>

                                    {/* 粉丝行操作：自己所在行不显示按钮；
                                        本人粉丝列表未回关显示"回关"，他人粉丝列表显示"关注" */}
                                    {!(userInfo && user.id === userInfo.id) && (
                                        user.followed ? (
                                            <button
                                                type="button"
                                                disabled={followSubmitting}
                                                onClick={() =>
                                                    handleListFollowToggle(user)
                                                }
                                                className="shrink-0 rounded-full border-[#964328]/20 bg-[#F4E8DA] px-3 py-1.5 text-xs text-[#8C6049] transition-all hover:bg-[#EBDAC6] sm:px-4 sm:text-sm cursor-pointer disabled:opacity-60 border-0"
                                            >
                                                已关注
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled={followSubmitting}
                                                onClick={() =>
                                                    handleListFollowToggle(user)
                                                }
                                                className="shrink-0 rounded-full border border-[#964328] bg-[#964328] px-3 py-1.5 text-xs text-[#FFF8ED] transition-all hover:bg-[#7e3720] sm:px-4 sm:text-sm cursor-pointer disabled:opacity-60"
                                            >
                                                {isSelf ? "回关" : "关注"}
                                            </button>
                                        )
                                    )}
                                </div>
                            ))}
                        </FollowListPanel>
                    )}
                </div>
            </main>
        </div>
    );
};

export default UserProfile;
