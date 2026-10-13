import { useNavigate } from "react-router-dom";

/**
 * 单字收藏卡片
 *
 * 样式一比一还原设计稿：
 * 宣纸底色卡片 + 撑满的单字图片 + 主题色分隔线
 * + 居中"单字"标题 + 书法家·碑帖 + 朝代·字体风格。
 */
const CharacterFavoriteCard = ({
    item,
}: {
    item: API.CharacterFavoriteItem;
}) => {
    const navigate = useNavigate();

    return (
        <div
            onClick={() =>
                navigate(`/copybook/${item.copybookId}/practise`)
            }
            className="w-46 h-70 group cursor-pointer rounded-lg overflow-hidden bg-[#FFFFFF] border border-[#964328]/10 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col"
        >
            {/* 单字图片：内边距留出宣纸边缘，图片撑满内容区 */}
            <div className="p-2 pb-1 pt-1.5">
                <div className="aspect-square overflow-hidden bg-[#F5EBDD] ">
                    {item.imageUrl ? (
                        <img
                            src={item.imageUrl}
                            alt={item.characterText || "单字"}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl font-bold font-serif text-[#964328]/40">
                            {item.characterText || "字"}
                        </div>
                    )}
                </div>
            </div>

            {/* 图片下方分隔线：主题色 */}
            <div className="mx-5 border-t border-[#964328]" />

            {/* 文本区：单字 + 书法家·碑帖 + 朝代·字体风格 */}
            <div className="px-2 py-2 text-center space-y-1.5 flex-1 flex flex-col justify-center">
                <h3 className="text-xl font-bold font-serif text-[#3F332A] leading-snug line-clamp-2">
                    {item.characterText || "未识别单字"}
                </h3>

                <p className="text-xs text-[#3F332A]">
                    {item.calligrapherName || "佚名"}
                    <span className="text-gray-400 mx-1.5">·</span>
                    <span className="text-[#964328]">
                        《{item.copybookName || "未知碑帖"}》
                    </span>
                </p>

                <p className="text-xs text-gray-500 mb-3">
                    {item.dynastyName || "朝代未知"}
                    <span className="mx-1.5">·</span>
                    {item.style || "字体未知"}
                </p>
            </div>
        </div>
    );
};

export default CharacterFavoriteCard;
