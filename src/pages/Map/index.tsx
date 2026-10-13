import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { App } from "antd";
import {
  EnvironmentOutlined,
  AppstoreOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { getDynastyList } from "../../services/dynasty/api";
import { getCalligrapherList } from "../../services/calligrapher/api";
import CalligraphyMapBoard from "../../components/CalligraphyMapBoard";
import HeroContent from "../../components/HeroContent";
import CalligrapherDetailDrawer from "../../components/CalligrapherDetailDrawer";
import HeroCalligraphy3DRing from "../../components/HeroCalligraphy3DRing";
import { usePageMeta } from "../../hooks/usePageMeta";

const Map = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();

  // 页面标题 + 浏览历史
  usePageMeta({ title: "书家列传", pageType: "calligrapher_list" });

  // 朝代列表
  const [dynastyList, setDynastyList] = useState<API.Dynasty[]>([]);
  // 当前选中的朝代 id（null 表示全部）
  const [selectedDynastyId, setSelectedDynastyId] = useState<number | null>(null);

  // 视图切换状态（地图视图 vs 时间轴）
  const [viewMode, setViewMode] = useState<"map" | "timeline">("map");

  // 书法家列表数据
  const [calligrapherList, setCalligrapherList] = useState<API.Calligrapher[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(false);

  // 详情抽屉弹窗控制
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [selectedCalligrapherId, setSelectedCalligrapherId] = useState<number>();

  // 获取朝代列表
  useEffect(() => {
    const fetchDynastyList = async () => {
      try {
        const res = await getDynastyList();
        if (res.code === 200) {
          setDynastyList(res.data || []);
        } else {
          message.error(res.message || "获取朝代列表失败");
        }
      } catch (error) {
        message.error("网络请求异常");
      }
    };
    fetchDynastyList();
  }, [message]);

  // 根据选中的朝代获取书法家列表
  useEffect(() => {
    const fetchCalligraphers = async () => {
      setLoadingList(true);
      try {
        // 请求书法家列表（包含代表作信息）
        const res = await getCalligrapherList();
        if (res.code === 200) {
          let list = res.data || [];
          // 根据朝代筛选
          if (selectedDynastyId !== null) {
            list = list.filter((item) => item.dynastyId === selectedDynastyId);
          }
          setCalligrapherList(list);
        }
      } catch (error) {
        message.error("获取书法家列表失败");
      } finally {
        setLoadingList(false);
      }
    };

    fetchCalligraphers();
  }, [selectedDynastyId, message]);

  // 打开书法家抽屉
  const handleOpenDrawer = (id: number) => {
    setSelectedCalligrapherId(id);
    setDrawerOpen(true);
  };

  // 渲染单个书法家精简卡片的公共逻辑
  const renderCalligrapherCard = (item: API.Calligrapher) => {
    const firstCopybookImg = item.representativeCopybooks?.[0]?.imageUrl;
    const otherCopybooks = item.representativeCopybooks || [];

    const birth = item.birthYear !== null && item.birthYear !== undefined ? item.birthYear : "?";
    const death = item.deathYear !== null && item.deathYear !== undefined ? item.deathYear : "?";
    const yearString = (item.birthYear != null || item.deathYear != null) ? `${birth}-${death}` : "?";

    const tagList = item.tags
      ? (Array.isArray(item.tags)
        ? item.tags
        : String(item.tags).split(/[,，]/).map((t) => t.trim()).filter(Boolean))
      : [];

    const tagStyleVariants = [
      "bg-[#964328] text-amber-50 border border-[#964328]",
      "bg-[#7A321C] text-amber-100 border border-[#7A321C]",
      "bg-[#964328]/15 text-[#964328] border border-[#964328]/30",
    ];

    return (
      <div
        key={item.id}
        onClick={() => navigate(`/aritcleWorks/${item.id}`)}
        className="
          group
          relative
          overflow-hidden
          rounded-sm
          p-3
          border border-[#964328]/15
          bg-[#FAF6ED]
          hover:bg-white
          hover:shadow-md
          hover:border-[#964328]/40
          transition-all
          duration-300
          cursor-pointer
          flex
          flex-col
          justify-between
          h-22.5
          w-full
        "
      >
        {/* 1. 代表作背景图 */}
        {firstCopybookImg && (
          <div
            className="
              absolute inset-0 bg-cover bg-center
              saturate-[0.25] opacity-20
              group-hover:opacity-30 group-hover:scale-105
              transition-all duration-500 pointer-events-none
            "
            style={{ backgroundImage: `url(${firstCopybookImg})` }}
          />
        )}

        {/* 2. 渐变底色遮罩 */}
        <div className="absolute inset-0 bg-linear-to-r from-[#FAF6ED]/95 via-[#FAF6ED]/85 to-transparent pointer-events-none" />

        {/* 3. 右侧融合式头像 */}
        {item.avatar && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-16 h-20 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
            <img
              src={item.avatar}
              alt={item.name}
              className="w-full h-full object-cover rounded-sm mask-[radial-gradient(ellipse_at_center,black_50%,transparent_100%)] filter contrast-105"
            />
          </div>
        )}

        {/* 4. 主要信息 */}
        <div className="relative z-10 flex flex-col justify-between h-full pr-14">
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="font-bold text-base text-gray-900 group-hover:text-[#964328] transition-colors font-serif leading-none">
                {item.name}
              </h3>
              <span className="text-xs text-gray-400 font-serif font-normal">
                {yearString}
              </span>
            </div>

            {otherCopybooks.length > 0 && (
              <p className="text-[11px] text-gray-500 font-serif mt-1 truncate leading-tight">
                <span className="text-gray-400">代表作：</span>
                {otherCopybooks.map((cb) => `《${cb.name}》`).join("")}
              </p>
            )}
          </div>

          {tagList.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-1">
              {tagList.map((tag, idx) => (
                <span
                  key={idx}
                  className={`text-[10px] px-1.5 py-0.5 rounded-sm font-serif flex items-center gap-0.5 leading-none ${
                    tagStyleVariants[idx % tagStyleVariants.length]
                  }`}
                >
                  <span className="text-[8px] opacity-70">◆</span>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <RightOutlined className="absolute right-2.5 top-2.5 text-[10px] text-gray-400 group-hover:text-[#964328] group-hover:translate-x-0.5 transition-all z-20" />
      </div>
    );
  };

  // 根据当前朝代筛选组装时间轴数据
  const displayDynasties = selectedDynastyId !== null
    ? dynastyList.filter((d) => d.id === selectedDynastyId)
    : dynastyList;

  const timelineGroups = displayDynasties
    .map((dynasty) => ({
      dynasty,
      list: calligrapherList.filter((c) => c.dynastyId === dynasty.id),
    }))
    .filter((group) => group.list.length > 0);

  return (
    <div className="bg-[#FFFBEB] min-h-screen font-serif pb-20 select-none">
      {/* 顶部 Hero 区域 */}
      <HeroContent height="60vh">
        <HeroCalligraphy3DRing
          calligrapherList={calligrapherList}
          onSelectCalligrapher={handleOpenDrawer}
        />
      </HeroContent>

      <div className="max-w-7xl mx-auto px-6 mt-12 relative z-20 space-y-10">
        {/* ================= 1. 顶部 4 块统计概览卡片 ================= */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/80 backdrop-blur-md rounded-sm p-5 border border-[#964328]/15 text-center shadow-xs">
            <div className="text-3xl font-bold text-[#964328] font-serif">
              {calligrapherList.length || 26}
            </div>
            <div className="text-xs text-gray-500 mt-1 font-serif">历代书家</div>
          </div>
          <div className="bg-white/80 backdrop-blur-md rounded-sm p-5 border border-[#964328]/15 text-center shadow-xs">
            <div className="text-3xl font-bold text-[#964328] font-serif">
              {dynastyList.length || 7}
            </div>
            <div className="text-xs text-gray-500 mt-1 font-serif">涵盖朝代</div>
          </div>
          <div className="bg-white/80 backdrop-blur-md rounded-sm p-5 border border-[#964328]/15 text-center shadow-xs">
            <div className="text-3xl font-bold text-[#964328] font-serif">24</div>
            <div className="text-xs text-gray-500 mt-1 font-serif">覆盖城市</div>
          </div>
          <div className="bg-white/80 backdrop-blur-md rounded-sm p-[#964328]/15 text-center shadow-xs">
            <div className="text-3xl font-bold text-[#964328] font-serif">2000+</div>
            <div className="text-xs text-gray-500 mt-1 font-serif">跨越年限</div>
          </div>
        </div>

        {/* ================= 2. 朝代筛选与视图切换栏 ================= */}
        <div className="bg-[#FAF6ED] backdrop-blur-sm p-5 rounded-sm border border-[#964328]/15 space-y-4 sticky top-15 z-30">
          {/* 朝代按钮行 */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedDynastyId(null)}
              className={`
                px-4 py-2 rounded-sm text-sm font-serif transition-all cursor-pointer border
                ${
                  selectedDynastyId === null
                    ? "bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-sm"
                    : "bg-white/80 text-gray-700 border-gray-200 hover:border-[#964328]/50 hover:text-[#964328]"
                }
              `}
            >
              全部
            </button>

            {dynastyList.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedDynastyId(item.id)}
                className={`
                  px-4 py-2 rounded-sm text-sm font-serif transition-all cursor-pointer border flex items-center gap-1
                  ${
                    selectedDynastyId === item.id
                      ? "bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-sm"
                      : "bg-white/80 text-gray-700 border-gray-200 hover:border-[#964328]/50 hover:text-[#964328]"
                  }
                `}
              >
                <span>{item.name}</span>
              </button>
            ))}
          </div>

          {/* 视图切换选择器 */}
          <div className="flex items-center justify-between pt-2 border-t border-[#964328]/10 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("map")}
                className={`
                  flex text-sm items-center gap-1.5 px-3.5 py-2 rounded-sm font-serif cursor-pointer transition-colors
                  ${
                    viewMode === "map"
                      ? "bg-[#964328] text-white"
                      : "bg-white/80 text-gray-600 hover:text-[#964328]"
                  }
                `}
              >
                <EnvironmentOutlined />
                <span>地图视图</span>
              </button>

              <button
                onClick={() => setViewMode("timeline")}
                className={`
                  flex text-sm items-center gap-1.5 px-3.5 py-2 rounded-sm font-serif cursor-pointer transition-colors
                  ${
                    viewMode === "timeline"
                      ? "bg-[#964328] text-white"
                      : "bg-white/80 text-gray-600 hover:text-[#964328]"
                  }
                `}
              >
                <AppstoreOutlined />
                <span>时间轴</span>
              </button>
            </div>

            <div className="text-gray-600 text-sm font-serif">
              {viewMode === "map" ? "地图交互：点击书家标注点可查看详情" : "时间轴视图：点击书家卡片可查看详情"}
            </div>
          </div>
        </div>

        {/* ================= 3. 页面主展示区（地图视图 VS 时间轴视图） ================= */}
        {viewMode === "map" ? (
          <>
            {/* 地图展示区 */}
            <div>
              <CalligraphyMapBoard
                dynastyId={selectedDynastyId}
                onSelectCalligrapher={handleOpenDrawer}
              />
            </div>

            {/* 全部书法家 Grid 列表区 */}
            <div className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-[#964328] rounded-sm inline-block" />
                  <h2 className="text-2xl font-bold text-gray-900 font-serif">
                    全部书法家一览
                  </h2>
                  <span className="text-xs text-gray-500 font-serif ml-1">
                    ({calligrapherList.length} 位)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {calligrapherList.map((item) => renderCalligrapherCard(item))}
              </div>
            </div>
          </>
        ) : (
          /* ================= 时间轴视图展示区 ================= */
          <div className="pt-4 pb-12 relative max-w-5xl mx-auto">
            {/* 时间轴标题头 */}
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-gray-900 font-serif mb-1">
                书法传承时间轴
              </h2>
              <p className="text-xs text-gray-500 font-serif">
                跨越千年书法文化传承，点击卡片可查看详情
              </p>
            </div>

            {/* 时间轴中间主干线 */}
            <div className="absolute left-1/2 top-28 bottom-6 w-0.5 bg-[#964328]/30 -translate-x-1/2 pointer-events-none" />

            {/* 按朝代分组循环渲染时间轴 */}
            {timelineGroups.length > 0 ? (
              timelineGroups.map((group) => (
                <div key={group.dynasty.id} className="mb-12 relative z-10">
                  {/* 朝代中心节点标签 */}
                  <div className="flex justify-center mb-8 relative">
                    <span className="bg-[#964328] text-amber-50 px-4 py-1 text-xs font-serif rounded-sm shadow-md border border-amber-200/30">
                      {group.dynasty.name}
                    </span>
                  </div>

                  {/* 该朝代下的书法家交错列表 */}
                  <div className="space-y-6 relative">
                    {group.list.map((item, index) => {
                      const isLeft = index % 2 === 0;
                      return (
                        <div
                          key={item.id}
                          className="relative flex items-center justify-between"
                        >
                          {/* 节点连接点 */}
                          <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#964328] border-2 border-[#FAF6ED] z-20 shadow-xs" />

                          {/* 左侧卡片区域 */}
                          <div
                            className={`w-[calc(50%-1.75rem)] ${
                              isLeft ? "block" : "invisible pointer-events-none"
                            }`}
                          >
                            {renderCalligrapherCard(item)}
                          </div>

                          {/* 右侧卡片区域 */}
                          <div
                            className={`w-[calc(50%-1.75rem)] ${
                              !isLeft ? "block" : "invisible pointer-events-none"
                            }`}
                          >
                            {renderCalligrapherCard(item)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 font-serif py-12">
                暂无对应朝代书法家数据
              </div>
            )}
          </div>
        )}
      </div>

      {/* 书法家详情 Drawer 弹窗 */}
      <CalligrapherDetailDrawer
        open={drawerOpen}
        id={selectedCalligrapherId}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
};

export default Map;