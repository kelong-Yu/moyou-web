import React from "react";
import { useNavigate } from "react-router-dom";
import { EyeOutlined, LikeOutlined, CommentOutlined } from "@ant-design/icons";

interface Props {
  list: API.WebCopybookResponse[];
}

const CopybookWaterfall: React.FC<Props> = ({ list }) => {
  const navigate = useNavigate();

  return (
    <div className="columns-4 gap-6 px-30">
      {list.map((item) => (
        <div key={item.id} className="break-inside-avoid mb-6">
          <div
            onClick={() => navigate(`/copybook/${item.id}`)}
            className="group cursor-pointer bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
          >
            {/* 1. 图片区域 + 底部渐变蒙版 */}
            <div className="relative w-full h-75 overflow-hidden bg-gray-100">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />

              {/* 图片底部渐变层：左下角放红底标签，右下角放透明背景浏览量 */}
              <div className="absolute inset-x-0 bottom-0 p-3 bg-linear-to-t from-black/70 via-black/30 to-transparent flex justify-between items-end">
                {/* 左下角：风格标签 */}
                <div className="flex flex-wrap gap-1">
                  {item.style && (
                    <span className="px-2 py-0.5 text-xs bg-[#1A1815]/80 text-amber-100 backdrop-blur-xs rounded shadow-xs">
                      {item.style}
                    </span>
                  )}
                </div>

                {/* 右下角：背景透明的浏览量 */}
                <div className="flex items-center space-x-1 text-xs text-white/90 bg-transparent px-1 py-0.5">
                  <EyeOutlined className="text-[11px]" />
                  <span>{ item.viewCount }</span>
                </div>
              </div>
            </div>

            {/* 2. 内容区域 */}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                {/* 标题 */}
                <div className="mb-2">
                  <h3 className="font-bold text-gray-900 text-base truncate font-serif">
                    {item.name}
                  </h3>
                </div>

                {/* 简介 */}
                {item.shortDescription && (
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                    {item.shortDescription}
                  </p>
                )}
              </div>

              {/* 卡片底部：左下角书法家姓名及朝代，右下角点赞与评论 */}
              <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                {/* 左下角：书法家姓名与朝代 */}
                <span
                  onClick={(e) => {
                    e.stopPropagation(); // 阻止冒泡，避免触发外层卡片的跳转
                    navigate(`/aritcleWorks/${item.calligrapherId}`);
                  }}
                  className="text-gray-500 truncate max-w-[55%] hover:text-[#B85C47] transition-colors cursor-pointer"
                >
                  {item.calligrapherName}
                  {item.dynastyName ? ` · ${item.dynastyName}` : ""}
                </span>

                {/* 右下角：点赞 + 评论 */}
                <div className="flex items-center space-x-3 text-gray-400 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      // 可在此处绑定点赞事件
                    }}
                    className="flex items-center space-x-1 hover:text-[#B85C47] transition-colors"
                  >
                    <LikeOutlined className="text-sm" />
                    <span>{(item as any).likeCount ?? 0}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      // 可在此处绑定评论点击事件
                    }}
                    className="flex items-center space-x-1 hover:text-blue-500 transition-colors"
                  >
                    <CommentOutlined className="text-sm" />
                    <span>{(item as any).commentCount ?? 0}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CopybookWaterfall;