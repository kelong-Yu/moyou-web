import React, { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import { getCalligrapherLocation } from "../../services/calligrapher/api";

const CHINA_GEO_JSON_URL =
  "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json";

interface MarkerItem {
  id: string | number;
  name: string;
  avatar: string;
  livingAddress: string;
  coord: [number, number];
  x: number;
  y: number;
}

const HomeCalligraphyMapComponent: React.FC = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  
  // 保存生成的真实 DOM 标注点
  const [markers, setMarkers] = useState<MarkerItem[]>([]);
  // 悬浮卡片状态
  const [hoveredData, setHoveredData] = useState<{
    item: MarkerItem;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    let rawLocationData: API.CalligrapherLocation[] = [];

    // 更新 DOM Marker 在地图上的绝对像素位置
    const updateMarkerPositions = () => {
      if (!chartInstance.current || rawLocationData.length === 0) return;

      const newMarkers: MarkerItem[] = [];
      rawLocationData.forEach((item, idx) => {
        if (item.longitude && item.latitude) {
          // 将地理经纬度转换为容器内的像素 [x, y]
          const pixel = chartInstance.current?.convertToPixel("geo", [
            item.longitude,
            item.latitude,
          ]);

          if (pixel) {
            newMarkers.push({
              id: item.id || idx,
              name: item.name || "未命名书家",
              avatar: item.avatar || "",
              livingAddress: item.livingAddress || "未知地点",
              coord: [item.longitude, item.latitude],
              x: pixel[0],
              y: pixel[1],
            });
          }
        }
      });
      setMarkers(newMarkers);
    };

    const initMap = async () => {
      if (!chartRef.current) return;

      const res = await getCalligrapherLocation();
      rawLocationData = res.code === 200 ? res.data || [] : [];

      try {
        const geoJson = await fetch(CHINA_GEO_JSON_URL).then((r) => r.json());
        echarts.registerMap("china", geoJson);

        if (!chartInstance.current) {
          chartInstance.current = echarts.init(chartRef.current);
        }

        const option: any = {
          backgroundColor: "transparent",
          geo: {
            map: "china",
            roam: true,
            zoom: 1.15,
            label: { show: false },
            itemStyle: {
              areaColor: "#e6e2d3",
              borderColor: "#a89f91",
              borderWidth: 1,
            },
            emphasis: {
              itemStyle: { areaColor: "#d9d2c2" },
              label: { show: false },
            },
          },
          series: [],
        };

        chartInstance.current.setOption(option);

        // 初始化计算一次打点位置
        updateMarkerPositions();

        // 当地图进行缩放、平移时，同步更新 HTML 标注点的位置
        chartInstance.current.on("georoam", () => {
          updateMarkerPositions();
          setHoveredData(null);
        });
      } catch (err) {
        console.error("加载地图失败:", err);
      }
    };

    initMap();

    const handleResize = () => {
      chartInstance.current?.resize();
      updateMarkerPositions();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-12 md:py-16 h-full flex flex-col md:flex-row items-center justify-between">
      {/* 左侧文字区 */}
      <div className="w-full md:w-5/12 pr-0 md:pr-8 flex flex-col justify-center mb-8 md:mb-0">
        <div className="bg-[#B85C47] text-white text-xs px-2.5 py-1 inline-flex w-max mb-6 rounded-sm">
          核心特色
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-widest font-serif">
          书法地图
        </h2>
        <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-8 tracking-wide font-light">
          以地理为经，以书家为纬，在真实的中国地图上标注历代书法家的故乡与活动地。
          从王羲之的会稽山阴到颜真卿的京兆长安，从苏轼的眉山到赵孟頫的湖州——
          一览千年书法文化的地理版图。
        </p>
        <div className="flex gap-6 mb-8">
          <div className="flex items-center text-gray-400 text-xs md:text-sm">
            <span className="w-2 h-2 rounded-full bg-[#B85C47] mr-2"></span>
            真实地图
          </div>
          <div className="flex items-center text-gray-400 text-xs md:text-sm">
            <span className="w-2 h-2 rounded-full bg-[#B85C47] mr-2"></span>
            朝代筛选
          </div>
          <div className="flex items-center text-gray-400 text-xs md:text-sm">
            <span className="w-2 h-2 rounded-full bg-[#B85C47] mr-2"></span>
            书家详情
          </div>
        </div>
        <a
          href="#map-explore"
          className="text-white hover:text-[#B85C47] transition-colors inline-flex items-center text-sm tracking-wider"
        >
          探索书法地图 <span className="ml-2">→</span>
        </a>
      </div>

      {/* 右侧地图区 */}
      <div className="w-full md:w-7/12 h-112.5 md:h-130 relative bg-[#FFFBEB] rounded-xl overflow-hidden border border-gray-800 shadow-xl">
        <div className="absolute top-4 left-4 z-10 bg-[#fdfdf7]/90 border border-[#c9b09a] p-2.5 rounded shadow-md pointer-events-none">
          <div className="font-serif font-bold text-[#333] text-xs md:text-sm">
            中国书法文化地图
          </div>
          <div className="text-[10px] md:text-[11px] text-gray-500 mt-0.5">
            悬浮标注点查看书家信息 · 支持缩放拖拽
          </div>
        </div>

        {/* ECharts 底图 */}
        <div ref={chartRef} className="w-full h-full" />

        {/* 覆盖层：100% 保证 CSS 圆形头像 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {markers.map((item) => (
            <div
              key={item.id}
              className="absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-150 hover:scale-125 cursor-pointer z-20"
              style={{ left: `${item.x}px`, top: `${item.y}px` }}
              onMouseEnter={() =>
                setHoveredData({ item, x: item.x, y: item.y })
              }
              onMouseLeave={() => setHoveredData(null)}
            >
              <img
                src={item.avatar || "https://via.placeholder.com/40"}
                alt={item.name}
                className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover border-2 border-[#B85C47] shadow-md bg-[#e6e2d3]"
              />
            </div>
          ))}

          {/* 鼠标悬浮信息卡片 */}
          {hoveredData && (
            <div
              className="absolute pointer-events-none z-30 transform -translate-x-1/2 -translate-y-full mb-3 transition-all"
              style={{
                left: `${hoveredData.x}px`,
                top: `${hoveredData.y - 8}px`,
              }}
            >
              <div className="bg-[#ffedf5]/95 border border-[#c9b09a] rounded-lg p-3 shadow-xl flex items-center gap-3 backdrop-blur-sm">
                <img
                  src={
                    hoveredData.item.avatar || "https://via.placeholder.com/40"
                  }
                  alt={hoveredData.item.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-[#B85C47]"
                />
                <div>
                  <div className="text-sm font-bold text-gray-800 font-serif">
                    {hoveredData.item.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    常居: {hoveredData.item.livingAddress}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeCalligraphyMapComponent;