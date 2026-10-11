import { Drawer } from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CloseOutlined, RightOutlined } from "@ant-design/icons";
import { getCalligrapherDetailDrawer } from "../../services/calligrapher/api";
import bgImg from "../../assets/lantingxu.jpg";

interface Props {
    open: boolean;
    id?: number | string;
    onClose: () => void;
}

// 标签解析助手：支持中文逗号与英文逗号
const parseTags = (tagStr?: string) => {
    if (!tagStr) return [];
    return tagStr.split(/[，,]/).map(t => t.trim()).filter(Boolean);
};

const CalligrapherDetailDrawer = ({ open, id, onClose }: Props) => {
    const navigate = useNavigate();
    const [detail, setDetail] = useState<API.CalligrapherDetail>();

    useEffect(() => {
        if (!open || !id) return;
        getCalligrapherDetailDrawer(id).then(res => {
            if (res.code === 200) {
                setDetail(res.data);
            }
        });
    }, [open, id]);

    const tagsList = parseTags(detail?.tags || detail?.goodAtStyle);

    return (
        <Drawer
            open={open}
            onClose={onClose}
            width={480} /* 👈 调整这里的数值即可改变 Drawer 宽度（原 420） */
            closable={false} // 使用自定义顶栏关闭按钮
            styles={{
                body: {
                    padding: 0,
                    backgroundColor: "#FAF6ED", // 宣纸暖白/淡黄背景色
                },
            }}
        >
            {detail && (
                <div className="min-h-full flex flex-col font-serif select-none">
                    {/* ================= 1. 顶部暗色头部区域（精简版） ================= */}
                    <div className="relative overflow-hidden bg-[#1A1815] text-white p-6 pt-10 pb-8 flex justify-between items-end min-h-40">
                        {/* 顶栏背景图及暗色调和遮罩 */}
                        <div
                            className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity pointer-events-none"
                            style={{ backgroundImage: `url(${bgImg})` }}
                        />
                        <div className="absolute inset-0 bg-linear-to-r from-[#1A1815] via-[#1A1815]/80 to-transparent pointer-events-none" />

                        {/* 右上角自定义关闭按钮 */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                        >
                            <CloseOutlined className="text-sm" />
                        </button>

                        {/* 左侧书法家基本信息（精简后：姓名 + 下方称号） */}
                        <div className="relative z-10 max-w-65">
                            {/* 姓名 */}
                            <h2 className="text-3xl font-bold tracking-widest text-amber-50 mb-2">
                                {detail.name}
                            </h2>

                            {/* 称号印章（置于姓名下方，样式保持不变） */}
                            {detail.title && (
                                <div>
                                    <span className="inline-block px-2 py-0.5 text-[11px] bg-[#964328]/80 text-amber-100 rounded border border-amber-300/30 font-serif">
                                        {detail.title}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* 右侧书法家头像（高度撑满、自适应宽度、边缘渐变虚化与背景融合） */}
                        {detail.avatar && (
                            <div className="absolute right-0 top-0 bottom-0 w-40 pointer-events-none overflow-hidden flex items-center justify-end z-10">
                                <img
                                    src={detail.avatar}
                                    alt={detail.name}
                                    className="h-full w-auto object-cover object-center opacity-90 transition-transform duration-700 hover:scale-105"
                                    style={{
                                        WebkitMaskImage:
                                            "radial-gradient(circle at 60% 50%, black 25%, transparent 80%)",
                                        maskImage:
                                            "radial-gradient(circle at 60% 50%, black 25%, transparent 80%)",
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* ================= 2. 详细介绍内容区域 ================= */}
                    <div className="p-6 text-gray-800 leading-relaxed space-y-6 flex-1">
                        {/* 人物小传 */}
                        {detail.introduction && (
                            <section>
                                <div className="flex items-center gap-2 mb-2.5">
                                    <span className="w-1.5 h-4 bg-[#964328] rounded-full inline-block" />
                                    <h3 className="font-bold text-base text-gray-900 tracking-wide">
                                        人物小传
                                    </h3>
                                </div>
                                <p className="text-sm text-gray-700 leading-6 pl-3.5 text-justify">
                                    {detail.introduction}
                                </p>
                            </section>
                        )}

                        {/* 艺术人生 */}
                        {detail.artisticLife && (
                            <section>
                                <div className="flex items-center gap-2 mb-2.5">
                                    <span className="w-1.5 h-4 bg-[#964328] rounded-full inline-block" />
                                    <h3 className="font-bold text-base text-gray-900 tracking-wide">
                                        艺术人生
                                    </h3>
                                </div>
                                <p className="text-sm text-gray-700 leading-6 pl-3.5 text-justify">
                                    {detail.artisticLife}
                                </p>
                            </section>
                        )}

                        {/* 风格特征 */}
                        {detail.styleFeature && (
                            <section>
                                <div className="flex items-center gap-2 mb-2.5">
                                    <span className="w-1.5 h-4 bg-[#964328] rounded-full inline-block" />
                                    <h3 className="font-bold text-base text-gray-900 tracking-wide">
                                        风格特征
                                    </h3>
                                </div>
                                <p className="text-sm text-gray-700 leading-6 pl-3.5 text-justify">
                                    {detail.styleFeature}
                                </p>
                            </section>
                        )}

                        {/* 主要成就/影响与地位 */}
                        {detail.achievement && (
                            <section>
                                <div className="flex items-center gap-2 mb-2.5">
                                    <span className="w-1.5 h-4 bg-[#964328] rounded-full inline-block" />
                                    <h3 className="font-bold text-base text-gray-900 tracking-wide">
                                        影响与地位
                                    </h3>
                                </div>
                                <p className="text-sm text-gray-700 leading-6 pl-3.5 text-justify">
                                    {detail.achievement}
                                </p>
                            </section>
                        )}

                        {/* 代表作品 */}
                        {detail.representativeCopybooks && detail.representativeCopybooks.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-1.5 h-4 bg-[#964328] rounded-full inline-block" />
                                    <h3 className="font-bold text-base text-gray-900 tracking-wide">
                                        代表作品
                                    </h3>
                                </div>

                                <div className="space-y-3 pl-0.5">
                                    {detail.representativeCopybooks.map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => {
                                                onClose();
                                                navigate(`/copybook/${item.id}`);
                                            }}
                                            className="
                                                group
                                                relative
                                                overflow-hidden
                                                rounded-lg
                                                p-3.5
                                                border border-[#964328]/15
                                                bg-white/70
                                                hover:bg-white
                                                hover:shadow-md
                                                hover:border-[#964328]/40
                                                transition-all
                                                duration-300
                                                cursor-pointer
                                                flex
                                                items-center
                                                justify-between
                                            "
                                        >
                                            {/* 作品背景图（降调饱和度 + 遮罩） */}
                                            {item.imageUrl && (
                                                <div
                                                    className="
                                                        absolute inset-0 bg-cover bg-center 
                                                        saturate-[0.35] opacity-20 
                                                        group-hover:opacity-30 group-hover:saturate-50 group-hover:scale-105 
                                                        transition-all duration-500 pointer-events-none
                                                    "
                                                    style={{ backgroundImage: `url(${item.imageUrl})` }}
                                                />
                                            )}
                                            <div className="absolute inset-0 bg-linear-to-r from-[#FAF6ED]/90 via-[#FAF6ED]/70 to-transparent pointer-events-none" />

                                            {/* 内容 */}
                                            <div className="relative z-10 flex items-center gap-3 min-w-0 pr-2">
                                                <span className="shrink-0 w-7 h-7 rounded bg-[#964328] text-white flex items-center justify-center font-serif text-xs shadow-2xs border border-amber-200/30">
                                                    帖
                                                </span>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-gray-900 text-sm group-hover:text-[#964328] transition-colors flex items-center gap-1">
                                                        《{item.name}》
                                                    </div>
                                                    {item.shortDescription && (
                                                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                                                            {item.shortDescription}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <RightOutlined className="relative z-10 text-xs text-gray-400 group-hover:text-[#964328] group-hover:translate-x-1 transition-all shrink-0" />
                                        </div>
                                    ))}
                                </div>

                                {/* 浏览书法家更多作品 */}
                                <div className="mt-4 text-center">
                                    <button
                                        onClick={() => {
                                            onClose();
                                            navigate(`/aritcleWorks/${detail.id}`);
                                        }}
                                        className="
                                            inline-flex items-center gap-2 
                                            px-5 py-2 rounded-full 
                                            border border-[#964328]/30 bg-[#964328]/5 
                                            text-[#964328] hover:bg-[#964328] hover:text-white 
                                            text-xs font-serif font-medium 
                                            transition-all duration-300 cursor-pointer 
                                            shadow-2xs group
                                        "
                                    >
                                        <span>浏览该书法家更多作品</span>
                                        <RightOutlined className="text-[10px] group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </section>
                        )}

                        {/* 风格标签 */}
                        {tagsList.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-2.5">
                                    <span className="w-1.5 h-4 bg-[#964328] rounded-full inline-block" />
                                    <h3 className="font-bold text-base text-gray-900 tracking-wide">
                                        风格标签
                                    </h3>
                                </div>
                                <div className="flex flex-wrap gap-2 pl-3.5">
                                    {tagsList.map((tag, idx) => (
                                        <span
                                            key={idx}
                                            className="px-3 py-1 bg-white text-gray-700 text-xs rounded border border-gray-200/80 shadow-2xs"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* 底部落款标语（已适配“墨友”） */}
                        <div className="pt-8 pb-4 text-center border-t border-[#964328]/10 mt-8">
                            <p className="text-xs text-gray-400 tracking-[0.2em]">
                                以墨会友 · 古今同游
                            </p>
                            <p className="text-[10px] text-[#964328]/60 mt-1">
                                —— 墨友 ——
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </Drawer>
    );
};

export default CalligrapherDetailDrawer;