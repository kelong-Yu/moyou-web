import { useState } from "react";
import { FileImageOutlined } from "@ant-design/icons";

export interface DictionaryCharacterCardProps {
    item: API.WebDictionaryCharacter;

    /** 点击卡片打开大图预览 */
    onPreview: () => void;
}

/**
 * 书法字典 · 单字作品卡片
 *
 * 突出书法图片本身：宣纸底 + object-contain 保持原始纵横比例，
 * 不拉伸不裁切；下方仅一行字头（含字体标签）
 * 与书法家 · 碑帖、朝代等真实元数据，字段缺失即隐藏。
 *
 * 图片加载失败时卡片保持尺寸稳定，展示占位状态。
 */
const DictionaryCharacterCard = ({
    item,
    onPreview,
}: DictionaryCharacterCardProps) => {
    /** 图片是否加载失败 */
    const [imageFailed, setImageFailed] = useState(false);

    const hasImage = !!item.imageUrl && !imageFailed;

    return (
        <div
            onClick={onPreview}
            title={`${item.characterText || ""} · ${
                item.calligrapherName || "佚名"
            }《${item.copybookName || ""}》`}
            className="group rounded-lg overflow-hidden bg-white border border-[#964328]/15 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-zoom-in flex flex-col"
        >
            {/* 单字图片：固定高度 + contain，保持原始比例 */}
            <div className="h-40 md:h-44 bg-[#F5EBDD] flex items-center justify-center p-2 overflow-hidden">
                {hasImage ? (
                    <img
                        src={item.imageUrl}
                        alt={`${item.characterText || "单字"} · ${
                            item.copybookName || ""
                        }`}
                        loading="lazy"
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500 select-none"
                        onError={(e) => {
                            setImageFailed(true);
                            (e.target as HTMLImageElement).style.visibility =
                                "hidden";
                        }}
                    />
                ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center gap-1 text-[#964328]/40">
                        <FileImageOutlined className="text-2xl" />
                        <span className="text-[11px]">图片加载失败</span>
                    </div>
                )}
            </div>

            {/* 元数据 */}
            <div className="px-2.5 py-2 border-t border-[#964328]/10 text-center space-y-1">
                <p className="flex items-center justify-center gap-1.5 leading-none">
                    <span className="text-base font-bold font-serif text-[#3F332A]">
                        {item.characterText || "未识别"}
                    </span>
                    {item.style && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#964328]/10 text-[#964328] border border-[#964328]/25">
                            {item.style}
                        </span>
                    )}
                </p>

                <p className="text-[11px] text-[#756B61] truncate">
                    {item.calligrapherName || "佚名"}
                    <span className="mx-1 text-gray-300">·</span>
                    <span className="text-[#964328]">
                        《{item.copybookName || "未知碑帖"}》
                    </span>
                </p>

                {(item.dynastyName || item.pageNumber) && (
                    <p className="text-[10px] text-gray-400">
                        {item.dynastyName || "朝代未知"}
                        {item.pageNumber ? ` · 第${item.pageNumber}页` : ""}
                    </p>
                )}
            </div>
        </div>
    );
};

export default DictionaryCharacterCard;
