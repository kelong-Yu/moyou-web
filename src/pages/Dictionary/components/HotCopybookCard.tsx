import {
    CommentOutlined,
    EyeOutlined,
    LikeOutlined,
} from "@ant-design/icons";

/**
 * 热搜碑帖卡片
 *
 * 与碑帖库瀑布流（CopybookWaterfall）单卡保持同一套视觉：
 * 封面 + 底部渐变蒙版（左字体标签 / 右浏览量）
 * + 标题、简介 + 分隔线下的书法家与点赞评论。
 *
 * 瀑布流组件本身按 columns 多列排布，无法嵌入字典页的 4 列网格，
 * 因此单独抽出这张卡片，跳转行为由外部 onOpen 决定。
 */
const HotCopybookCard = ({
    item,
    onOpen,
}: {
    item: API.WebCopybookResponse;
    /** 点击卡片（调用方跳转碑帖详情） */
    onOpen: (id: number) => void;
}) => {
    return (
        <div
            onClick={() => onOpen(item.id)}
            className="group cursor-pointer bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
        >
            {/* 封面 + 底部渐变蒙版 */}
            <div className="relative w-full h-75 overflow-hidden bg-gray-100">
                <img
                    src={item.imageUrl}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                <div className="absolute inset-x-0 bottom-0 p-3 bg-linear-to-t from-black/70 via-black/30 to-transparent flex justify-between items-end">
                    <div className="flex flex-wrap gap-1">
                        {item.style && (
                            <span className="px-2 py-0.5 text-xs bg-[#1A1815]/80 text-amber-100 backdrop-blur-xs rounded shadow-xs">
                                {item.style}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center space-x-1 text-xs text-white/90 bg-transparent px-1 py-0.5">
                        <EyeOutlined className="text-[11px]" />
                        <span>{item.viewCount}</span>
                    </div>
                </div>
            </div>

            {/* 内容区 */}
            <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                    <div className="mb-2">
                        <h3 className="font-bold text-gray-900 text-base truncate font-serif">
                            {item.name}
                        </h3>
                    </div>

                    {item.shortDescription && (
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                            {item.shortDescription}
                        </p>
                    )}
                </div>

                <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-500 truncate max-w-[55%]">
                        {item.calligrapherName}
                        {item.dynastyName ? ` · ${item.dynastyName}` : ""}
                    </span>

                    <div className="flex items-center space-x-3 text-gray-400 shrink-0">
                        <span className="flex items-center space-x-1">
                            <LikeOutlined className="text-sm" />
                            <span>{item.likeCount ?? 0}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                            <CommentOutlined className="text-sm" />
                            <span>{item.commentCount ?? 0}</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HotCopybookCard;
