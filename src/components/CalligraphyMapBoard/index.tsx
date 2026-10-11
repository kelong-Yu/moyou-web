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

interface CalligraphyMapBoardProps {
  /** 传入已筛选的书法家列表数据（包含经纬度） */
  data?: API.Calligrapher[] | API.CalligrapherLocation[];
  /** 选中的朝代 ID */
  dynastyId?: number | null;
  /** 点击标注点打开详情的回调 */
  onSelectCalligrapher?: (id: number) => void;
}

const CalligraphyMapBoard: React.FC<CalligraphyMapBoardProps> = ({
  data,
  dynastyId,
  onSelectCalligrapher,
}) => {
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

  const rawLocationDataRef = useRef<any[]>([]);

  // 更新 DOM Marker 在地图上的绝对像素位置
  const updateMarkerPositions = () => {
    if (!chartInstance.current || rawLocationDataRef.current.length === 0) {
      setMarkers([]);
      return;
    }

    const newMarkers: MarkerItem[] = [];
    rawLocationDataRef.current.forEach((item, idx) => {
      // 确保经纬度存在且为有效数值
      if (item.longitude && item.latitude) {
        const pixel = chartInstance.current?.convertToPixel("geo", [
          Number(item.longitude),
          Number(item.latitude),
        ]);

        if (pixel) {
          newMarkers.push({
            id: item.id || idx,
            name: item.name || "未命名书家",
            avatar: item.avatar || "",
            livingAddress: item.livingAddress || item.birthplace || "未知地点",
            coord: [Number(item.longitude), Number(item.latitude)],
            x: pixel[0],
            y: pixel[1],
          });
        }
      }
    });
    setMarkers(newMarkers);
  };

  // 处理数据更新逻辑（优先使用传入的 data，其次自主请求 API）
  const refreshLocationData = async () => {
    // 优先使用父组件传进来的已筛选数据
    if (data && Array.isArray(data)) {
      rawLocationDataRef.current = data;
      updateMarkerPositions();
      return;
    }

    // fallback: 若未传入 data，则自主请求接口
    try {
      // @ts-ignore
      const res = await getCalligrapherLocation(dynastyId ?? undefined);
      if (res.code === 200) {
        const list = res.data || [];
        rawLocationDataRef.current = list;
        updateMarkerPositions();
      }
    } catch (err) {
      console.error("获取书法家位置失败:", err);
    }
  };

  // 初始化地图
  useEffect(() => {
    const initMap = async () => {
      if (!chartRef.current) return;

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

        // 首次加载点位数据
        await refreshLocationData();

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

  // 当外部传入的 data 或 dynastyId 发生改变时，自动触发重绘标注点
  useEffect(() => {
    if (chartInstance.current) {
      refreshLocationData();
    }
  }, [data, dynastyId]);

  return (
    <div className="w-full h-130 relative bg-[#FAF6ED] rounded-xl overflow-hidden border border-[#964328]/20 shadow-lg select-none">
      {/* 左上角说明面板 */}
      <div className="absolute top-4 left-4 z-10 bg-[#FAF6ED]/90 border border-[#964328]/30 p-3 rounded-lg shadow-md pointer-events-none backdrop-blur-sm">
        <div className="font-serif font-bold text-gray-900 text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#964328]" />
          中国书法文化地图
        </div>
        <div className="text-xs text-gray-500 mt-1">
          悬浮标注点查看书家信息 · 支持滚轮缩放与拖拽
        </div>
      </div>

      {/* ECharts 底图 */}
      <div ref={chartRef} className="w-full h-full" />

      {/* 覆盖层：自定义圆形头像标注 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {markers.map((item) => (
          <div
            key={item.id}
            className="absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 hover:scale-125 cursor-pointer z-20"
            style={{ left: `${item.x}px`, top: `${item.y}px` }}
            onClick={() => onSelectCalligrapher?.(Number(item.id))}
            onMouseEnter={() =>
              setHoveredData({ item, x: item.x, y: item.y })
            }
            onMouseLeave={() => setHoveredData(null)}
          >
            <img
              src={item.avatar || "https://via.placeholder.com/40"}
              alt={item.name}
              className="w-9 h-9 rounded-full object-cover border-2 border-[#964328] shadow-md bg-[#e6e2d3]"
            />
          </div>
        ))}

        {/* 悬浮小卡片 */}
        {hoveredData && (
          <div
            className="absolute pointer-events-none z-30 transform -translate-x-1/2 -translate-y-full mb-3 transition-all"
            style={{
              left: `${hoveredData.x}px`,
              top: `${hoveredData.y - 8}px`,
            }}
          >
            <div className="bg-[#1A1815]/90 border border-amber-300/30 rounded-lg p-3 shadow-2xl flex items-center gap-3 backdrop-blur-md text-white">
              <img
                src={
                  hoveredData.item.avatar || "https://via.placeholder.com/40"
                }
                alt={hoveredData.item.name}
                className="w-10 h-10 rounded-full object-cover border border-amber-300/50"
              />
              <div>
                <div className="text-sm font-bold font-serif text-amber-100">
                  {hoveredData.item.name}
                </div>
                <div className="text-xs text-gray-300 mt-0.5 font-serif">
                   {hoveredData.item.livingAddress}
                </div>
              </div>
            </div>
          </div>
        )}  
      </div>

      {/* 底部图例 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-[#1A1815]/80 text-amber-100 text-xs px-4 py-1.5 rounded-full border border-amber-200/20 backdrop-blur-sm flex items-center gap-6 font-serif">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#964328] inline-block" />
          书法家 ({markers.length})
        </span>
        <span className="flex items-center gap-1.5 text-gray-400">
          <span className="w-4 h-px bg-amber-200/50 inline-block" />
          历经长廊
        </span>
        <span className="flex items-center gap-1.5 text-gray-400">
          <span className="w-2 h-2 rounded-full border border-amber-200/60 inline-block" />
          有迹
        </span>
      </div>
    </div>
  );
};

export default CalligraphyMapBoard;