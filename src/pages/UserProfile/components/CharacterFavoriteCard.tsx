import { useNavigate } from "react-router-dom";
import moyouSeal from "../../../assets/moyoucard.png";

/**
 * 单字收藏卡片
 *
 * 样式一比一还原设计稿：
 * 宣纸底色卡片 + 撑满的单字图片 + 主题色分隔线
 * + 居中引首章「墨友」
 * + 书法家 · 《碑帖》 · 单字 + 朝代·字体风格。
 *
 * 复用时可覆盖点击行为与卡片尺寸
 * （如临帖页全屏大图查看器中展示单字卡片）：
 * onClick 传入后不再跳转临帖页；
 * sizeClassName 传入后替换默认 w-46 h-70 尺寸；
 * onCopybookClick 传入后，仅《碑帖名》一小块可单独点击（阻止冒泡），
 * 卡片其余区域仍走 onClick。
 */
const CharacterFavoriteCard = ({
    item,
    onClick,
    onCopybookClick,
    sizeClassName,
}: {
    item: API.CharacterFavoriteItem;
    /** 点击回调；不传则默认跳转对应碑帖的临帖页 */
    onClick?: () => void;
    /** 单独点击《碑帖名》时的回调；不传则该文字不可单独点击 */
    onCopybookClick?: () => void;
    /** 根节点尺寸类名，默认 "w-46 h-70" */
    sizeClassName?: string;
}) => {
    const navigate = useNavigate();

    const handleClick = () => {
        if (onClick) {
            onClick();
            return;
        }
        navigate(`/copybook/${item.copybookId}/practise`);
    };

    return (
        <div
            onClick={handleClick}
            className={`${sizeClassName ?? "w-50 h-80"} group cursor-pointer rounded-lg overflow-hidden bg-[#FFFFFF] border border-[#964328]/10 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col`}
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
            <div className="mx-5 mt-1 border-t border-[#964328]" />

            {/* 文本区：引首章（原单字居中的位置）+ 书法家·碑帖 + 朝代·字体风格 */}
            <div className="px-2 py-2 text-center space-y-1.5 flex-1 flex flex-col justify-center">
                {/* 墨友引首章：盖在单字原来的位置，文本区居中 */}
                <img
                    src={moyouSeal}
                    alt="墨友"
                    draggable={false}
                    className="mx-auto h-9 w-auto opacity-90 select-none mb-3"
                />

                <p className="text-xs text-[#3F332A] ">
                    {item.calligrapherName || "佚名"}
                    <span className="text-gray-400 mx-1.5">·</span>
                    <span className="text-xs font-bold font-serif text-[#3F332A]">
                        {item.characterText || "未识别"}
                    </span>
                    <span className="text-gray-400 mx-1.5">·</span>
                    {onCopybookClick ? (
                        <span
                            onClick={(event) => {
                                // 只让碑帖名这一小块生效，不触发整卡的 onClick
                                event.stopPropagation();
                                onCopybookClick();
                            }}
                            className="text-[#964328] cursor-pointer hover:underline"
                        >
                            《{item.copybookName || "未知碑帖"}》
                        </span>
                    ) : (
                        <span className="text-[#964328]">
                            《{item.copybookName || "未知碑帖"}》
                        </span>
                    )}
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
