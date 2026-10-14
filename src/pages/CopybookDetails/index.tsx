import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { App } from "antd";
import { useSelector } from "react-redux";
import type { RootState } from "../../stores";
import HeroContent from "../../components/HeroContent";
import CalligrapherDetailDrawer from "../../components/CalligrapherDetailDrawer";
import { getCopybookDetail, getRecommendCopybook,favoriteCopybook,unFavoriteCopybook,getCopybookInteraction,likeCopybook,unlikeCopybook } from "../../services/copybook/api";
import { usePageMeta } from "../../hooks/usePageMeta";
import bgImg from "../../assets/lantingxu.jpg";
import InteractionBar from "../../components/InteractionBar";
import CommentSection from "../../components/CommentSection";
import {
    UserOutlined,
    EyeOutlined,
    LeftOutlined,
    RightOutlined
} from "@ant-design/icons";

// 1. 日期格式化助手：仅保留 YYYY-MM-DD
const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    if (dateStr.includes("T")) {
        return dateStr.split("T")[0];
    }
    return dateStr.slice(0, 10);
};

// 2. 标签分割助手：支持中文逗号 ， 和英文逗号 ,
const parseTags = (tagStr?: string) => {
    if (!tagStr) return [];
    return tagStr
        .split(/[，,]/)
        .map(t => t.trim())
        .filter(Boolean);
};

const CopybookDetails = () => {

    const { id } = useParams();
    const {message} = App.useApp();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // 当前登录用户（单字临帖入口需登录）
    const userInfo = useSelector((state: RootState) => state.user.userInfo);

    // 从「我的消息 · 评论互动」跳转时携带 ?commentId=，用于评论区定位
    const focusCommentId = Number(searchParams.get("commentId")) || undefined;
    const [detail, setDetail] = useState<API.WebCopybookDetailResponse>();
    const [recommendList, setRecommendList] = useState<API.WebCopybookRecommendResponse[]>([]);

    // 页面标题 + 浏览历史：取得真实碑帖名称后才设置并上报
    usePageMeta({
        title: detail?.name || "",
        pageType: "copybook",
        targetId: detail?.id ?? (id ? Number(id) : undefined),
        ready: !!detail?.name,
    });

    // 书法家Drawer状态
    const [calligrapherDrawerOpen,setCalligrapherDrawerOpen] = useState(false);

    // 当前书法家id
    const [calligrapherId,setCalligrapherId] = useState<number>();

    // 猜你想看 - 单张滑动索引
    const [currentIndex, setCurrentIndex] = useState(0);

    // 打开书法家抽屉弹窗（预留接口）
    const handleOpenCalligrapherDrawer = () => {
        if(!detail?.calligrapherId){
            return;
        }
        setCalligrapherId(detail.calligrapherId);
        setCalligrapherDrawerOpen(true);
    };

    const [interaction, setInteraction] = useState<API.WebCopybookInteractionResponse | null>(null);
    const [interactionCopybookId, setInteractionCopybookId] = useState<number | null>(null);
    const [interactionUpdating, setInteractionUpdating] = useState(false);

    const refreshInteraction = async (copybookId: number) => {
        const res = await getCopybookInteraction(copybookId);
        if (res.code === 200) {
            setInteraction(res.data);
            setInteractionCopybookId(copybookId);
        }
        return res;
    };

    // 请求碑帖详情页数据
    useEffect(() => {
        if (!id) return;

        const copybookId = Number(id);

        // 防止 id 不是数字
        if (Number.isNaN(copybookId)) {
            return;
        }

        let cancelled = false;

        // 获取碑帖详情
        getCopybookDetail(copybookId).then(res => {
            if (res.code === 200) {
                setDetail(res.data);
            }
        });

        // 获取猜你想看
        getRecommendCopybook(copybookId).then(res => {
            if (res.code === 200) {
                setRecommendList(res.data || []);
            }
        });

        // 获取碑帖互动信息
        const loadInteraction = async () => {
            try {
                const res = await getCopybookInteraction(copybookId);

                if (!cancelled && res.code === 200) {
                    setInteraction(res.data);
                    setInteractionCopybookId(copybookId);
                }
            } catch (error) {
                console.error("获取碑帖互动信息失败", error);
            }
        };

        loadInteraction();

        return () => {
            cancelled = true;
        };

    }, [id]);

    /**
     * 点赞 / 取消点赞
     */
    const handleLike = async () => {

            if (!detail?.id || !interaction || interactionUpdating) {
                return;
            }
            const wasLiked = interaction.liked;
            setInteractionUpdating(true);
            try {
                const res = wasLiked
                    ? await unlikeCopybook(detail.id)
                    : await likeCopybook(detail.id);

                if(res.code !== 200){

                    if(res.code === 4001){
                        message.info("请先登录")
                        navigate("/login");
                    }

                    if(res.code === 4000){
                        message.info( '你已经点过赞了，如此喜欢，不妨收藏一下');
                    }
                    return;
                }

                await refreshInteraction(detail.id);
            }catch(error){

                console.error(error);
            } finally {
                setInteractionUpdating(false);
            }

    };

    /**
     * 收藏 / 取消收藏
     */
    const handleFavorite = async () => {

            if (!detail?.id || !interaction || interactionUpdating) {
                return;
            }
            const wasFavorited = interaction.favorited;
            setInteractionUpdating(true);
            try {
                const res = wasFavorited
                    ? await unFavoriteCopybook(detail.id)
                    : await favoriteCopybook(detail.id);
                if(res.code !== 200){

                    if(res.code === 4001){
                        message.info("请先登录")
                        navigate("/login");
                    }
                    if(res.code === 4000){
                        message.info( '你已经收藏了');
                    }
                    return;
                }
                message.success(
                    wasFavorited
                    ?
                    "取消收藏成功"
                    :
                    "收藏成功"
                );

                await refreshInteraction(detail.id);
            }catch(error){
                console.error(error);
            } finally {
                setInteractionUpdating(false);
            }

    };

    // 最多显示6张卡片（若超过6张，前5张为内容，第6张为“查看更多”）
    const hasMoreThanSix = recommendList.length > 6;
    const processedList = hasMoreThanSix 
        ? recommendList.slice(0, 5) 
        : recommendList.slice(0, 6);

    // 计算卡片总数量和可滑动的最大索引
    const totalCardsCount = processedList.length + (hasMoreThanSix ? 1 : 0);
    const VISIBLE_COUNT = 3; // 视图内同时显示的卡片数
    const maxIndex = Math.max(0, totalCardsCount - VISIBLE_COUNT);

    const handlePrev = () => {
        setCurrentIndex(prev => Math.max(0, prev - 1));
    };

    const handleNext = () => {
        setCurrentIndex(prev => Math.min(maxIndex, prev + 1));
    };

    // 处理分割后的标签
    const calligrapherTags = parseTags(detail?.calligrapherTag);
    const interactionLoading = interactionCopybookId !== Number(id);

    return (
        <div className="bg-[#FAF6ED]">
            {/* 右侧抽屉 */}
            <CalligrapherDetailDrawer
                open={calligrapherDrawerOpen}
                id={calligrapherId}
                onClose={()=>{
                    setCalligrapherDrawerOpen(false)
                }}
            />

            {/* 左侧悬浮操作栏 点赞收藏评论*/}
            <InteractionBar 
                   likeCount={
                        interaction?.likeCount ?? 0
                    }
                    commentCount={
                        interaction?.commentCount ?? 0
                    }
                    favoriteCount={
                        interaction?.favoriteCount ?? 0
                    }
                    liked={
                        interaction?.liked ?? false
                    }
                    favorited={
                        interaction?.favorited ?? false
                    }
                    onLike={handleLike}
                    onFavorite={handleFavorite}
                    loading={interactionLoading}
                    disabled={interactionLoading || interactionUpdating}
                    onComment={()=>{
                        document.getElementById("copybook-comments")?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                        });
                    }}
            />

            {/* 顶部展示图（带底部深色渐变阴影） */}
            <HeroContent height="60vh">
                {detail?.imageUrl && (
                    <div className="relative w-full h-full overflow-hidden">
                        <img
                            src={detail.imageUrl}
                            alt={detail.name}
                            className="w-full h-full object-cover"
                        />
                        {/* 底部渐变加深阴影 */}
                        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/95 via-black/70 to-transparent pointer-events-none" />
                    </div>
                )}
            </HeroContent>

            {/* 内容区域 */}
            <div className="max-w-7xl mx-auto flex gap-12 py-12 px-8">
                {/* 左侧详情 */}
                <div className="flex-1">
                    <h1 className="text-4xl font-bold text-gray-900 font-serif">
                        {detail?.name}
                    </h1>

                    {/* 属性栏：转换后的日期与可点击的书法家姓名 */}
                    <div className="mt-3 text-gray-500 flex items-center flex-wrap gap-1 text-sm">
                        <button
                            onClick={()=>{
                                navigate(`/aritcleWorks/${detail?.calligrapherId}`)
                            }}
                            className="text-[#964328] font-bold hover:underline cursor-pointer flex items-center gap-1 transition"
                        >
                            <UserOutlined className="text-xs" />
                            {detail?.calligrapherName}
                        </button>

                        <span className="mx-1 text-gray-300">/</span>
                        <span>{detail?.dynastyName}</span>
                        <span className="mx-1 text-gray-300">/</span>
                        <span>{detail?.style}</span>
                        <span className="mx-1 text-gray-300">/</span>
                        {/* 去除了时分秒的日期 */}
                        <span className="text-gray-400">{formatDate(detail?.createTime)}</span>
                    </div>

                    {/* 简要介绍 */}
                    <div className="mt-10 text-gray-700 leading-9 text-lg">
                        {detail?.shortDescription}
                    </div>

                    {/* 释文 */}
                    <div className="mt-12">
                        <h2 className="text-3xl font-bold mb-5 font-serif">释文</h2>
                        <div className="border-l-2 border-[#964328] pl-5 text-gray-700 text-lg leading-10 font-serif">
                            {detail?.transcription === null ? "暂无介绍" : detail?.transcription}
                        </div>
                    </div>

                    {/* 详细简介 */}
                    <div className="mt-10 text-gray-700 leading-9 text-lg">
                        {detail?.description}
                    </div>

                    <CommentSection
                        copybookId={detail?.id}
                        focusCommentId={focusCommentId}
                        onCommentCreated={async () => {
                            if (detail?.id) {
                                await refreshInteraction(detail.id);
                            }
                        }}
                    />
                </div>

                {/* 右侧信息 */}
                <div className="w-100 pl-8">
                    {/* 书家信息模块 */}
                    <div className="mb-8">
                        <h3 className="text-xl font-bold mb-3 font-serif text-gray-800">
                            书家信息
                        </h3>

                        {/* 简约古风书家卡片 */}
                        <div
                            onClick={handleOpenCalligrapherDrawer}
                            className="
                            group
                            relative
                            overflow-hidden
                            p-4
                            -mx-3.5
                            rounded-xl
                            transition-all
                            duration-300
                            cursor-pointer
                            border border-transparent
                            hover:border-[#964328]/30
                            hover:bg-white/80
                            hover:shadow-md
                            flex
                            items-center
                            justify-between
                            gap-4
                            min-h-25
                            "
                        >
                            {/* 1. 悬浮背景图及淡化蒙版 */}
                            <div
                                className="
                                absolute inset-0 bg-cover bg-center opacity-0 
                                group-hover:opacity-20 transition-opacity duration-500 
                                pointer-events-none rounded-xl
                                "
                                style={{ backgroundImage: `url(${bgImg})` }}
                            />
                            {/* 蒙版增强：保证悬浮时背景图片淡化且文字清晰 */}
                            <div className="absolute inset-0 bg-linear-to-r from-[#FFFBEB]/90 via-[#FFFBEB]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                            {/* 2. 左侧书家姓名与标签 */}
                            <div className="relative z-10 flex-1 min-w-0">
                                {/* 姓名与朱红小印章 */}
                                <div className="flex items-center gap-2 mb-2.5">
                                    <span className="text-2xl font-bold font-serif text-gray-900 group-hover:text-[#964328] transition-colors">
                                        {detail?.calligrapherName}
                                    </span>
                                    {/* 朱红古风印章徽章 */}
                                    <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-[#964328] text-white font-serif shadow-2xs border border-amber-300/40">
                                        名家
                                    </span>
                                </div>

                                {/* 拆分后的标签列表 */}
                                <div className="flex flex-wrap gap-1.5">
                                    {calligrapherTags.map((tag, idx) => (
                                        <span
                                            key={idx}
                                            className="
                                            inline-flex items-center gap-1
                                            px-2.5 py-1 rounded-md
                                            bg-[#964328]/5 text-[#964328] text-xs font-serif
                                            border border-[#964328]/15
                                            group-hover:bg-[#964328] group-hover:text-white group-hover:border-[#964328]
                                            transition-all duration-300
                                            "
                                        >
                                            <span className="text-amber-500 text-[10px] group-hover:text-amber-200">◆</span>
                                            <span>{tag}</span>
                                        </span>
                                    ))}

                                    {calligrapherTags.length === 0 && (
                                        <span className="text-xs text-gray-400 italic">暂无标签</span>
                                    )}
                                </div>
                            </div>

                            {/* 3. 右侧书法家头像（高度撑满、自适应宽度、边缘渐变虚化融合） */}
                            {detail?.calligrapherAvatar && (
                                <div className="relative z-10 self-stretch w-28 shrink-0 pointer-events-none flex items-center justify-end">
                                    <img
                                        src={detail.calligrapherAvatar}
                                        alt={detail.calligrapherName || "书法家头像"}
                                        className="h-20 w-auto object-cover object-center transition-transform duration-500 group-hover:scale-105"
                                        style={{
                                            // 径向蒙版：让头像中心清晰，四周逐渐透明虚化，与背景完美融合
                                            WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 30%, transparent 85%)",
                                            maskImage: "radial-gradient(circle at 50% 50%, black 30%, transparent 85%)",
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mb-8">
                        <h3 className="text-xl font-bold mb-3 font-serif">形制尺寸</h3>
                        <p className="text-gray-600 text-lg">
                            {detail?.dimensions === null ? "暂无介绍" : detail?.dimensions}
                        </p>

                        <h3 className="text-xl font-bold mt-8 font-serif">马上开练</h3>
                        <div className="flex gap-3 mt-4">            
                            <button
                                onClick={() => {
                                    if (!detail?.id) return;

                                    // 单字临帖页仅登录用户可用：
                                    // 未登录先去登录页并带回临帖地址，
                                    // 登录成功后自动返回（路由处另有 RequireLogin 兜底）
                                    if (
                                        !userInfo ||
                                        !localStorage.getItem("token")
                                    ) {
                                        message.info(
                                            "请先登录后再使用单字临帖"
                                        );
                                        navigate(
                                            `/login?redirect=${encodeURIComponent(
                                                `/copybook/${detail.id}/practise`
                                            )}`
                                        );
                                        return;
                                    }

                                    // 单字临帖页面：新浏览器窗口打开
                                    window.open(
                                        `/copybook/${detail.id}/practise`,
                                        "_blank"
                                    );
                                }}
                                className="flex-1 py-3 rounded-lg bg-[#964328] text-white hover:bg-[#b74e2b] transition cursor-pointer"
                            >
                                临帖 →
                            </button>
                            <button 
                            onClick={()=>message.info("功能正在开发中")}
                            className="flex-1 py-3 rounded-lg border border-[#964328] text-[#964328] hover:bg-[#964328]/10 transition cursor-pointer">
                                在线练习 →
                            </button>
                        </div>

                        {/* 猜你想看 */}
                        <div className="mt-12">
                            <h3 className="text-xl font-bold mb-5 font-serif">猜你想看</h3>

                            <div className="relative group/container">
                                {/* 上一张按钮 */}
                                {currentIndex > 0 && (
                                    <button
                                        onClick={handlePrev}
                                        className="
                                        absolute -left-2 top-0 bottom-0 z-20
                                        w-5 bg-black/40 hover:bg-black/70 text-white
                                        flex items-center justify-center
                                        transition rounded-l-lg backdrop-blur-[2px]
                                        cursor-pointer
                                        "
                                        title="上一张"
                                    >
                                        <LeftOutlined className="text-xs" />
                                    </button>
                                )}

                                {/* 滑动卡片视口 */}
                                <div className="overflow-hidden h-40 rounded-lg">
                                    <div
                                        className="flex h-full gap-2 transition-transform duration-500 ease-in-out"
                                        style={{
                                            transform: `translateX(calc(-${currentIndex} * (100% + 8px) / 3))`
                                        }}
                                    >
                                        {processedList.map(item => (
                                            <div
                                                key={item.id}
                                                onClick={() => navigate(`/copybook/${item.id}`)}
                                                className="
                                                relative
                                                w-[calc((100%-16px)/3)]
                                                shrink-0
                                                h-full
                                                rounded-lg
                                                overflow-hidden
                                                cursor-pointer
                                                group/card
                                                "
                                            >
                                                <img
                                                    src={item.imageUrl}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover rounded-lg group-hover/card:scale-110 transition-transform duration-500"
                                                />

                                                {/* 底部黑色渐变遮罩 */}
                                                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover/card:opacity-95 transition-opacity" />

                                                {/* 左下角名字 */}
                                                <div
                                                    className="
                                                    absolute
                                                    bottom-2
                                                    left-2
                                                    right-9
                                                    text-white
                                                    text-xs
                                                    truncate
                                                    font-medium
                                                    "
                                                    title={item.name}
                                                >
                                                    {item.name}
                                                </div>

                                                {/* 右下角浏览量 */}
                                                <div
                                                    className="
                                                    absolute
                                                    bottom-2
                                                    right-2
                                                    text-white/90
                                                    text-[11px]
                                                    flex
                                                    items-center
                                                    gap-0.5
                                                    "
                                                >
                                                    <EyeOutlined className="text-[11px]" />
                                                    <span>{item.viewCount}</span>
                                                </div>
                                            </div>
                                        ))}

                                        {/* 超过6张时展示的“查看更多”卡片 */}
                                        {hasMoreThanSix && (
                                            <div
                                                onClick={() => navigate("/copybook")}
                                                className="
                                                relative
                                                w-[calc((100%-16px)/3)]
                                                shrink-0
                                                h-full
                                                rounded-lg
                                                border border-dashed border-[#964328]/50
                                                bg-[#964328]/10
                                                hover:bg-[#964328]/20
                                                flex
                                                flex-col
                                                items-center
                                                justify-center
                                                cursor-pointer
                                                text-[#964328]
                                                font-bold
                                                text-xs
                                                gap-1
                                                p-1
                                                transition-colors
                                                "
                                            >
                                                <span>查看</span>
                                                <span>更多 →</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 下一张按钮 */}
                                {currentIndex < maxIndex && (
                                    <button
                                        onClick={handleNext}
                                        className="
                                        absolute -right-2 top-0 bottom-0 z-20
                                        w-5 bg-black/40 hover:bg-black/70 text-white
                                        flex items-center justify-center
                                        transition rounded-r-lg backdrop-blur-[2px]
                                        cursor-pointer
                                        "
                                        title="下一张"
                                    >
                                        <RightOutlined className="text-xs" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CopybookDetails;
