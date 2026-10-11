import React, { useState, useEffect, useRef } from "react";
import HeroContent from "../../components/HeroContent";
import CalligraphyGallery from "../../components/CalligraphyGallery";
import AnnouncementCard from "../../components/AnnouncementCard";
import HomeCalligraphyMapComponent from "../../components/HomeCalligrapherMapComponent";
import homebg from "../../assets/homebg10.jpg";
import { Select, Radio, Tooltip } from "antd";
import { getAnnouncementList } from "../../services/announcement/api";
import {
  AppstoreOutlined,
  SlidersOutlined,
  SearchOutlined,
  DownOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  PlusOutlined,
  StarFilled,
} from "@ant-design/icons";

const Home: React.FC = () => {
  // 控制高级搜索面板展开/收起状态
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  // 搜索关键字
  const [searchValue, setSearchValue] = useState<string>("");
  // 数据源
  const [source, setSource] = useState<string>("all");
  // 匹配模式：exact (精确) / fuzzy (模糊)
  const [matchType, setMatchType] = useState<string>("exact");

  // 顶部文本悬浮状态
  const [isHoverTopText, setIsHoverTopText] = useState<boolean>(false);

  // 引用搜索框大容器，用于检测点击外部
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // 公告列表
  const [announcementList,setAnnouncementList] = useState<API.Announcement[]>([]);

  // 监听点击外部事件
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 获取公告列表
  useEffect(()=>{
    const fetchAnnouncement = async()=>{
        const res = await getAnnouncementList();
        if(res.code === 200){
            setAnnouncementList(
                res.data || []
            );
        }
    };
      fetchAnnouncement();
  },[]);

  const handleSearch = () => {
    console.log("执行搜索：", {
      searchValue,
      source,
      matchType,
    });
  };

  return (
    <>
      <HeroContent height="100vh">
        {/* 中间内容区域：使用 pb-20 将整体内容向上微调 */}
        <div
          className="relative flex h-full flex-col items-center justify-center pb-16 transition-all duration-300"
          style={{
            backgroundImage: `url(${homebg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* 标题部分：增加高度与不透明度动画 */}
          <div
            className={`flex pb-2 flex-col items-center transition-all duration-300 ease-in-out overflow-visible ${
              isExpanded
                ? "max-h-0 opacity-0 mb-0 scale-95 pointer-events-none"
                : "max-h-40 opacity-100 mb-8 scale-100"
            }`}
          >
            {/* 1. 悬浮文字 + 右侧弹出框 */}
            <div
              className="relative group cursor-pointer mb-8"
              onMouseEnter={() => setIsHoverTopText(true)}
              onMouseLeave={() => setIsHoverTopText(false)}
            >
              <span className="text-xl tracking-widest text-gray-500 hover:text-gray-700 transition-colors">
                与历代书法大师隔空对话
              </span>

              {/* 悬浮弹出的深色卡片框 */}
              <div
                className={`absolute left-full top-1/2 -translate-y-1/2 ml-4 min-w-68 p-3 bg-gray-800/90 text-white rounded-lg shadow-xl backdrop-blur-sm border border-gray-700/50 transition-all duration-300 z-20 pointer-events-none ${
                  isHoverTopText
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 -translate-x-2"
                }`}
              >
                {/* 气泡左侧小三角 */}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800/90"></div>

                <p className="text-[16px] font-light leading-relaxed tracking-wider">
                  你字肯定没我写得好看，嘻嘻~
                </p>
                <div className="text-[14px] text-gray-400 text-right mt-1 font-serif">
                  —— 王羲之
                </div>
              </div>
            </div>

            <div className="relative flex items-center">
              <h1 className="text-6xl font-bold text-gray-800 tracking-wider font-serif">
                全球书法资源
                <span className="text-[#964328]">学习中心</span>
              </h1>
              <span className="ml-2 mb-4 bg-red-700 text-white text-[10px] px-1.5 py-0.5 rounded border border-red-800 shadow-sm transform -rotate-6">
                AI 驱动版
              </span>
            </div>
          </div>

          {/* 搜索框主容器（绑定 ref 用于检测点击外部） */}
          <div
            ref={searchContainerRef}
            className="w-250 max-w-[92vw] transition-all duration-300 pb-20"
          >
            {/* 白色的主搜索条 */}
            <div className="flex items-center bg-white rounded-xl p-2 shadow-lg border border-gray-100">
              {/* 左侧：下拉选择AI聊天或数据检索 */}
              <div className="flex items-center px-2 border-r border-gray-200 shrink-0 text-[#964328]">
                <AppstoreOutlined className=" text-xl mr-1.5 " />
                <Select
                  defaultValue="all"
                  value={source}
                  onChange={(val) => setSource(val)}
                  bordered={false}
                  suffixIcon={
                    <DownOutlined className="text-xs text-[#964328]" />
                  }
                  className="w-32 font-normal text-[#964328]"
                  options={[
                    { value: "all", label: "数据检索" },
                    { value: "tie", label: "AI聊天" },
                  ]}
                />
              </div>

              {/* 中间：输入框 */}
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="输入书名、作者或版本"
                className="flex-1 px-4 py-2 text-gray-700 text-sm focus:outline-none bg-transparent"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />

              {/* 右侧：筛选按钮 & 搜索按钮 */}
              <div className="flex items-center space-x-2 shrink-0">
                {/* 展开/收起按钮 */}
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className={`p-2.5 rounded-lg border transition-all duration-200 flex items-center justify-center ${
                    isExpanded
                      ? "bg-gray-100 border-gray-300 text-gray-800"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                  title="搜索选项"
                >
                  <SlidersOutlined className="text-lg" />
                </button>

                {/* 砖红色搜索按钮 */}
                <button
                  type="button"
                  onClick={handleSearch}
                  className="bg-[#B85C47] hover:bg-[#A34F3C] text-white p-2.5 rounded-lg shadow transition-colors flex items-center justify-center px-4"
                >
                  <SearchOutlined className="text-lg" />
                </button>
              </div>
            </div>

            {/* 展开的搜索选项面板（加入 Grid 展开动画） */}
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                isExpanded
                  ? "grid-rows-[1fr] opacity-100 mt-3"
                  : "grid-rows-[0fr] opacity-0 mt-0 pointer-events-none"
              }`}
            >
              <div className="overflow-hidden">
                <div className="bg-white/95 backdrop-blur-md rounded-xl p-6 shadow-xl border border-gray-100 text-gray-700 text-sm">
                  {/* 面板顶部说明 */}
                  <div className="flex items-start mb-4">
                    <SlidersOutlined className="text-[#B85C47] text-lg mr-2.5 mt-0.5" />
                    <div>
                      <div className="font-bold text-gray-800 text-base">
                        搜索选项
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        配置高级检索匹配功能
                      </div>
                    </div>
                  </div>

                  {/* 字词替换区 */}
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 mb-4">
                    <div>
                      <span className="font-semibold text-gray-700">
                        字词替换
                      </span>
                      <span className="text-xs text-gray-400 ml-3">
                        点击“添加条件”设置字词替换逻辑
                      </span>
                    </div>
                    <button className="text-xs text-gray-500 hover:text-gray-800 flex items-center">
                      <PlusOutlined className="mr-1 text-[10px]" /> 添加条件
                    </button>
                  </div>

                  {/* 单选组：精确匹配 VS 模糊匹配 */}
                  <Radio.Group
                    onChange={(e) => setMatchType(e.target.value)}
                    value={matchType}
                    className="w-full space-y-3"
                  >
                    {/* 1. 精确匹配 */}
                    <div
                      className={`p-3.5 rounded-lg border transition-all ${
                        matchType === "exact"
                          ? "border-red-200 bg-red-50/20"
                          : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <Radio value="exact" className="items-start">
                        <div className="ml-1">
                          <div className="flex items-center font-bold text-gray-800">
                            精确匹配检索
                            <StarFilled className="text-amber-400 text-xs ml-1.5" />
                          </div>
                          <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                            基于全词拆分精确匹配的检索方式，速度较慢，但能够严格匹配用户输入关键词
                          </div>
                          <div className="flex items-center text-xs text-gray-400 mt-1">
                            <Tooltip title="详情说明">
                              <InfoCircleOutlined className="mr-1" />
                            </Tooltip>
                            可仅使用单字进行检索
                          </div>
                        </div>
                      </Radio>
                    </div>

                    {/* 2. 模糊匹配 */}
                    <div
                      className={`p-3.5 rounded-lg border transition-all ${
                        matchType === "fuzzy"
                          ? "border-red-200 bg-red-50/20"
                          : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <Radio value="fuzzy" className="items-start">
                        <div className="ml-1">
                          <div className="flex items-center font-bold text-gray-800">
                            模糊匹配检索
                          </div>
                          <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                            结合分词和语义理解快速匹配的检索方式，速度极快，但可能遗漏部分结果
                          </div>
                          <div className="flex items-center text-xs text-amber-600/80 mt-1">
                            <WarningOutlined className="mr-1 text-amber-500" />
                            必须输入2词以上
                          </div>
                        </div>
                      </Radio>
                    </div>
                  </Radio.Group>
                </div>
              </div>
            </div>

            {/* 2. 搜索框下方的公告栏 */}
            <AnnouncementCard
              list={announcementList}
              setList={setAnnouncementList}
            />
          </div>
        </div>
      </HeroContent>

      {/* 网站简要介绍：三大维度·墨韵传承 */}
      <HeroContent height="80vh" backgroundColor="#964328">
        <div className="w-full max-w-7xl mx-auto py-20 px-6 flex flex-col items-center">
          
          {/* 顶部小红印章图标 */}
          <div className="w-8 h-8 bg-[#B85C47] text-white flex items-center justify-center font-serif text-sm font-bold rounded-sm shadow-sm mb-4">
            三
          </div>

          {/* 主标题与副标题 */}
          <h2 className="text-4xl md:text-5xl font-bold text-amber-50 tracking-wider mb-4 font-serif">
            三大维度 · 墨韵传承
          </h2>
          <p className=" text-amber-100 text-base md:text-xl text-center font-light mb-12 tracking-wide">
            ......
          </p>

          {/* 三列卡片容器 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
            
            {/* 卡片 1：笔 · 实用功能 */}
            <div className=" bg-amber-50 p-8 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between items-start border border-gray-100/80">
              <div className="w-full">
                {/* 黑色印章块 */}
                <div className="w-10 h-12 bg-gray-900 text-white font-serif text-xl font-bold flex items-center justify-center mb-6 rounded-sm">
                  书
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-4 font-serif">
                  完全开放
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-8 h-12">
                  墨友是一个自由开放的数字化习字平台。致力于在线书法练习、字帖生成、笔画拆解演示、碑帖高清浏览等，让习字触手可及
                </p>
              </div>

              <div className="w-full">
                {/* 标签 */}
                <div className="flex gap-2 mb-8">
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    在线练习
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    字帖生成
                  </span>
                </div>
                {/* 了解更多按钮 */}
                <a
                  href="#practice"
                  className="inline-flex items-center text-xs font-semibold text-gray-700 hover:text-[#B85C47] transition-colors group"
                >
                  了解更多{" "}
                  <span className="ml-1 transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </a>
              </div>
            </div>

            {/* 卡片 2：墨 · 书法文化 */}
            <div className="bg-amber-50 p-8 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between items-start border border-gray-100/80">
              <div className="w-full">
                {/* 砖红色印章块 */}
                <div className="w-10 h-12 bg-[#B85C47] text-white font-serif text-xl font-bold flex items-center justify-center mb-6 rounded-sm">
                  精
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-4 font-serif">
                  精心挑选
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-8 h-12">
                  我们尽量挑选欣赏和在阅读价值高的相关碑帖，使用数字化展览、书法历史长廊、流派介绍、经典作品赏析与注解方式让古帖不再陌生。
                </p>
              </div>

              <div className="w-full">
                {/* 标签 */}
                <div className="flex gap-2 mb-8">
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    碑帖展览
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    历史长廊
                  </span>
                </div>
                {/* 了解更多按钮 */}
                <a
                  href="#culture"
                  className="inline-flex items-center text-xs font-semibold text-gray-700 hover:text-[#B85C47] transition-colors group"
                >
                  了解更多{" "}
                  <span className="ml-1 transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </a>
              </div>
            </div>

            {/* 卡片 3：韵 · 审美艺术 */}
            <div className="bg-amber-50 p-8 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between items-start border border-gray-100/80">
              <div className="w-full">
                {/* 墨绿色印章块 */}
                <div className="w-10 h-12 bg-[#4A6B53] text-white font-serif text-xl font-bold flex items-center justify-center mb-6 rounded-sm">
                  展
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-4 font-serif">
                  全力呈现
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-8 h-12">
                  我们尽可能呈现碑帖古籍品貌、内容。借此计划让大家沉浸式欣赏数字艺术、书法与现代设计融合的创意展示。希望大家能从中感受到人类文明进程。
                </p>
              </div>

              <div className="w-full">
                {/* 标签 */}
                <div className="flex gap-2 mb-8">
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    数字展厅
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    动态墨迹
                  </span>
                </div>
                {/* 了解更多按钮 */}
                <a
                  href="#art"
                  className="inline-flex items-center text-xs font-semibold text-gray-700 hover:text-[#B85C47] transition-colors group"
                >
                  了解更多{" "}
                  <span className="ml-1 transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </a>
              </div>
            </div>

          </div>
        </div>
      </HeroContent>

      {/* 碑帖列表 */}
      <HeroContent height="80vh" backgroundColor="#FFFBEB">
        <CalligraphyGallery />
      </HeroContent>
      
      {/* 书法地图 */}
      <HeroContent height="80vh" backgroundColor="#0F172A">
        <HomeCalligraphyMapComponent />
      </HeroContent>
      
      {/* 底部文字介绍 */}
      <HeroContent height="50vh">
        <div
          className="relative flex h-full flex-col items-center justify-center pb-16 transition-all duration-300 overflow-hidden"
          style={{
            backgroundImage: `url(${homebg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* 1. 宣纸淡黄/白色半透明遮罩层：让背景图变淡 */}
          <div className="absolute inset-0 bg-[#f4efe6]/80 pointer-events-none" />
          {/* 如果想要纯白淡化，改用: <div className="absolute inset-0 bg-white/80 pointer-events-none" /> */}

          {/* 2. 内容层：需要加上 relative 和 z-10 确保文字在遮罩上方 */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center mt-8">
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#964328] mb-4 tracking-widest">
              实现古籍数字化资源汇聚共享
            </h1>
            <p className="text-lg text-gray-600 mb-12 tracking-wide font-light">
              ——《关于推进新时代古籍工作的意见》
            </p>
            <button className="px-8 py-4 rounded-full bg-[#964328] hover:bg-[#b74e2b] text-white text-lg font-medium transition-all shadow-md flex items-center gap-2 cursor-pointer">
              立即登录 <span>→</span>
            </button>
          </div>
        </div>
      </HeroContent>
    </>
  );
};

export default Home;