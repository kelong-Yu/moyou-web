import React, { useEffect, useState } from "react";
import { App } from "antd";
import { getNewCopybookList } from "../../services/copybook/api";

const CalligraphyGallery: React.FC = () => {
  const { message } = App.useApp();
  const [copybookList, setCopybookList] = useState<API.Copybook[]>([]);
  const [isBigHovered, setIsBigHovered] = useState(false);

  useEffect(() => {
    const fetchCopyList = async () => {
      try {
        const res = await getNewCopybookList();
        if (res.code === 200) {
          setCopybookList(res.data || []);
        } else {
          message.error(res.message || "获取碑帖列表失败");
        }
      } catch (error) {
        message.error("网络请求异常");
      }
    };
    fetchCopyList();
  }, []);

  const items = copybookList.slice(0, 8);

  return (
    <section className="w-full max-w-7xl mx-auto py-22 px-6 flex flex-col md:flex-row gap-8 items-center justify-between">
      {/* 左侧介绍文字区域 (带 2 根古风装饰竖线) */}
      <div className="w-full md:w-1/3 flex items-center relative pl-2">
        {/* 竖线 1：主饰线（赭红色渐变，靠左、较长） */}
        <div className="w-[3px] h-48 bg-gradient-to-b from-transparent via-[#964328] to-transparent rounded-full opacity-80 mr-3 shrink-0" />

        {/* 竖线 2：副饰线（浅红棕色渐变，稍微精短，营造层次感） */}
        <div className="w-[1.5px] h-32 bg-gradient-to-b from-transparent via-[#964328]/40 to-transparent rounded-full mr-6 shrink-0" />

        {/* 文字与按钮主体内容 */}
        <div className="flex flex-col items-start gap-4">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 tracking-wide font-serif">
            推荐碑帖集
          </h2>
          <p className="text-gray-600 text-base md:text-lg leading-relaxed font-light">
            汇集历代经典碑帖，浏览你喜欢的书法作品。
          </p>
          <div className="flex gap-3 mt-2">
            <button className="px-5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors shadow-sm cursor-pointer">
              所有碑帖
            </button>
            <button className="px-5 py-2 rounded-md bg-[#964328] hover:bg-[#b74e2b] text-white text-sm font-medium transition-colors shadow-sm cursor-pointer">
              热门碑帖
            </button>
          </div>
        </div>
      </div>

      {/* 右侧图片网格区域 */}
      <div
        className="w-full md:w-2/3 h-[520px] grid gap-2 transition-all duration-500 ease-in-out"
        style={{
          gridTemplateColumns: isBigHovered
            ? "0.8fr 2.2fr 1.5fr 0.8fr"
            : "1fr 1fr 1fr 1fr",
          gridTemplateRows: isBigHovered
            ? "0.8fr 2.2fr 0.8fr"
            : "1fr 1fr 1fr",
        }}
      >
        {items.map((item, index) => {
          const isBig = index === 1;

          return (
            <div
              key={item.id || index}
              onMouseEnter={() => isBig && setIsBigHovered(true)}
              onMouseLeave={() => isBig && setIsBigHovered(false)}
              className={`group relative overflow-hidden rounded-lg cursor-pointer bg-gray-100 ${
                isBig
                  ? "col-span-2 row-span-2 z-10 shadow-lg"
                  : "col-span-1 row-span-1"
              }`}
            >
              {/* 图片 */}
              <img
                src={item.imageUrl || item.fileUrl}
                alt={item.name}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />

              {/* 遮罩渐变 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

              {/* 作品名称 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="px-3 py-1 bg-black/40 backdrop-blur-sm text-white text-xs md:text-sm font-medium rounded tracking-widest border border-white/20 transition-transform duration-300 group-hover:scale-105">
                  {item.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default CalligraphyGallery;