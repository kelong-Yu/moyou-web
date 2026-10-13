import React, { useState, useRef, useEffect } from "react";
import './index.css';
import { Radio, Tooltip,App,Pagination  } from "antd";
import CopybookWaterfall from "../../components/CopybookWaterfall";
import HeroContent from "../../components/HeroContent";
import { getDynastyList } from "../../services/dynasty/api";
import { getCopybookPage,getBannerCopybook } from "../../services/copybook/api";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useNavigate } from "react-router-dom";

import {
  AppstoreOutlined,
  SlidersOutlined,
  SearchOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  StarFilled,
} from "@ant-design/icons";

const CopyBook: React.FC = () => {

  const {message} = App.useApp();
  const navigate = useNavigate();

  // 页面标题 + 浏览历史
  usePageMeta({ title: "碑帖字库", pageType: "copybook_list" });
  
  // 在组件顶部定义状态和筛选数据
  const fontStyles = ["全部字体", "篆书", "隶书", "楷书", "行书", "草书"];

  // 组件内部
  const [activeStyle, setActiveStyle] = useState<string>("全部字体");
  const [activeDynasty,setActiveDynasty] = useState<string>("全部朝代")
  
  const [current,setCurrent] = useState(1);

  const [total,setTotal] = useState(0);

  const pageSize = 12;
  //朝代列表
  const [dynastyList, setDynastyList] = useState<API.Dynasty[]>([]);
  //碑帖列表
  const [copybookList, setCopybookList] = useState<API.WebCopybookResponse[]>([]);
  //banner列表
  const [bannerCopybooks,setBannerCopybooks] = useState<API.WebCopybookBannerResponse[]>([]);

  const bannerImages1 = bannerCopybooks.slice(0,6);

  const bannerImages2 = bannerCopybooks.slice(6,12);  

  const [searchValue, setSearchValue] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [matchType, setMatchType] = useState<string>("FUZZY");

  const searchContainerRef = useRef<HTMLDivElement>(null);
  //监听普遍流组件
  const waterfallRef = useRef<HTMLDivElement>(null);

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

  //获取朝代列表
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
  }, []);

  //获取banner列表
  useEffect(()=>{
    const fetchBanner = async()=>{
        const res = await getBannerCopybook();
        if(res.code===200){
            setBannerCopybooks(res.data);
        }
    };
    fetchBanner();
  },[]);

  //获取碑帖分页列表并添加查询条件
  const fetchCopybookList = async(
      page:number = 1,
      dynastyId?:number,
      style?:string
  )=>{
      const res = await getCopybookPage({
          current:page,
          pageSize,
          dynastyId,
          style
      });

      if(res.code === 200){

          setCopybookList(res.data.records);
          setTotal(res.data.total);
          setCurrent(page);

      }

  };

  //点击分页获取筛选条件
  const getCurrentDynastyId = ()=>{

    if(activeDynasty==="全部朝代"){
        return undefined;
    }
    return dynastyList.find(
        item=>item.name===activeDynasty
    )?.id;

  };
  const getCurrentStyle = ()=>{

      if(activeStyle==="全部字体"){
          return undefined;
      }
      return activeStyle;

  };

  //监听 CopybookWaterfall，当用户向下滑瀑布流进入窗口10%请求数据
  useEffect(()=>{
      const observer = new IntersectionObserver(
          (entries)=>{
              if(entries[0].isIntersecting){
                  fetchCopybookList(
                      1,
                      getCurrentDynastyId(),
                      getCurrentStyle()
                  );
                  observer.disconnect();
              }
          },
          {
              threshold:0.1
          }
      );

      if(waterfallRef.current){
          observer.observe(waterfallRef.current);
      }
      return ()=>{
          observer.disconnect();
      };
  },[]);

  //搜索跳转
  const handleSearch = () => {
    if(!searchValue.trim()){
        message.warning("请输入搜索内容");
        return;
    }

    navigate(
        `/search?keyword=${encodeURIComponent(searchValue)}&matchType=${matchType}`
    );
  };

  return (
    <div className="w-full">
      <HeroContent height="60vh" backgroundColor="#0f0f0f">
        <div className="relative w-full h-full pt-8 overflow-hidden flex flex-col justify-center items-center">
          
          {/* 背景无缝滚动区 */}8
          <div className="absolute inset-0 flex flex-col justify-center opacity-80 pointer-events-none overflow-hidden ">
            <div className="flex w-max scroll-right translate-y-1 ">
              {[...bannerImages1, ...bannerImages1].map((item, index) => (
                <img
                  key={`right-${index}`}
                  src={item.imageUrl}
                  alt="calligraphy"
                  className="h-50 w-auto object-cover rounded-sm p-2 mx-2 bg-white/10 border border-white/20 shadow-xl backdrop-blur-sm"
                />
              ))}
            </div>
            <div className="flex w-max scroll-left translate-y-14">
              {[...bannerImages2, ...bannerImages2].map((item, index) => (
                <img
                  key={`left-${index}`}
                  src={item.imageUrl}
                  alt="calligraphy"
                  className="h-50 w-auto object-cover rounded-md mx-2 p-2 bg-white/10 border border-white/20 shadow-xl backdrop-blur-sm"
                />
              ))}
            </div>
          </div>

          {/* 前景内容区 */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 w-full opacity-90">
            <h1 className="text-6xl md:text-6xl font-bold text-white tracking-widest mb-6 font-serif">
              碑帖书库
            </h1>
            <h4 className="text-xl md:text-xl  text-gray-400 tracking-widest mb-6 font-serif">"书之妙道，神采为上，形质次之"</h4>

            {/* 搜索框与面板主容器 */}
            <div ref={searchContainerRef} className="w-250 max-w-[92vw] transition-all duration-300 flex flex-col items-center">
              
              {/* 白色搜索条 */}
              <div className="w-full flex items-center bg-white rounded-xl p-2 shadow-lg border border-gray-100">
                <div className="flex items-center px-2 border-r border-gray-200 shrink-0 text-[#964328]">
                  <AppstoreOutlined className="text-xl mr-1.5" />
                  <span>数据检索</span>
                </div>
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="输入碑帖名或书法家"
                  className="flex-1 px-4 py-2 text-gray-700 text-sm focus:outline-none bg-transparent"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <div className="flex items-center space-x-2 shrink-0">
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

                  <button
                    type="button"
                    onClick={handleSearch}
                    className="bg-[#B85C47] hover:bg-[#A34F3C] text-white p-2.5 rounded-lg shadow transition-colors flex items-center justify-center px-4"
                  >
                    <SearchOutlined className="text-lg" />
                  </button>
                </div>
              </div>

              {/* 展开面板：宽度设为 w-full 彻底对齐搜索框，内部文字统一靠左 text-left */}
              <div
                className={`w-full transition-all duration-300 ease-in-out grid ${
                  isExpanded
                    ? "grid-rows-[1fr] opacity-100 mt-2"
                    : "grid-rows-[0fr] opacity-0 mt-0 pointer-events-none"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="bg-white/95 backdrop-blur-md rounded-xl p-4 shadow-xl border border-gray-100 text-gray-700 text-left text-xs">
                    
                    {/* 面板头部 */}
                    <div className="flex items-center mb-3">
                      <SlidersOutlined className="text-[#B85C47] text-base mr-2" />
                      <div>
                        <div className="font-bold text-gray-800 text-sm">
                          搜索选项
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          配置高级检索匹配功能
                        </div>
                      </div>
                    </div>

                    

                    {/* 单选组：确保内部完全靠左 */}
                    <Radio.Group
                      onChange={(e) => setMatchType(e.target.value)}
                      value={matchType}
                      className="w-full space-y-2.5 text-left"
                    >
                      {/* 1. 精确匹配 */}
                      <label
                        className={`flex items-start p-3 rounded-lg border cursor-pointer transition-all ${
                          matchType === "EXACT"
                            ? "border-red-200 bg-red-50/20"
                            : "border-gray-100 hover:border-gray-200"
                        }`}
                      >
                        <Radio value="EXACT" className="mt-0.5 mr-2.5 shrink-0" />
                        <div className="flex-1 text-left">
                          <div className="flex items-center font-bold text-gray-800 text-xs">
                            精确匹配检索
                            <StarFilled className="text-amber-400 text-[10px] ml-1" />
                          </div>
                          <div className="text-[11px] text-gray-500 mt-1 leading-normal">
                            基于全词拆分精确匹配的检索方式，速度较慢，但能够严格匹配用户输入关键词
                          </div>
                          <div className="flex items-center text-[11px] text-gray-400 mt-1">
                            <Tooltip title="详情说明">
                              <InfoCircleOutlined className="mr-1 text-[10px]" />
                            </Tooltip>
                            可仅使用单字进行检索
                          </div>
                        </div>
                      </label>

                      {/* 2. 模糊匹配 */}
                      <label
                        className={`flex items-start p-3 rounded-lg border cursor-pointer transition-all ${
                          matchType === "FUZZY"
                            ? "border-red-200 bg-red-50/20"
                            : "border-gray-100 hover:border-gray-200"
                        }`}
                      >
                        <Radio value="FUZZY" className="mt-0.5 mr-2.5 shrink-0" />
                        <div className="flex-1 text-left">
                          <div className="flex items-center font-bold text-gray-800 text-xs">
                            模糊匹配检索
                          </div>
                          <div className="text-[11px] text-gray-500 mt-1 leading-normal">
                            结合分词和语义理解快速匹配的检索方式，速度极快，但可能遗漏部分结果
                          </div>
                          <div className="flex items-center text-[11px] text-amber-600/80 mt-1">
                            <WarningOutlined className="mr-1 text-amber-500 text-[10px]" />
                            必须输入2字以上
                          </div>
                        </div>
                      </label>
                    </Radio.Group>

                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-[#0a080d] via-[#0a080d]/60 
          to-transparent pointer-events-none z-30" />
        </div>
      </HeroContent>

      {/* 切换按钮容器 */}
      <div className="sticky top-15 z-30">
        <HeroContent height="18vh" backgroundColor="#FFFBEB">
          <div className="w-full max-w-6xl mx-auto h-full flex flex-col items-center justify-center gap-4">
            {/* 上方：朝代筛选 */}
            <div className="flex items-center justify-center space-x-2">

              {/* 全部朝代 */}
              <button
                type="button"
                onClick={() => {
                    setActiveDynasty("全部朝代");
                    fetchCopybookList(
                        1,
                        undefined,
                        getCurrentStyle()
                    );
                }}
                className={`px-4 py-2 text-sm transition-colors duration-150 rounded-sm cursor-pointer ${
                  activeDynasty === "全部朝代"
                    ? "bg-[#1A1A1A] text-white font-medium shadow-sm"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-100/80"
                }`}
              >
                全部朝代
              </button>

              {dynastyList.map((dynasty) => (
                <button
                  key={dynasty.id}
                  type="button"
                  onClick={() => {
                      setActiveDynasty(dynasty.name);
                      fetchCopybookList(
                          1,
                          dynasty.id,
                          getCurrentStyle()
                      );
                  }}
                  className={`px-4 py-2 text-sm transition-colors duration-150 rounded-sm cursor-pointer ${
                    activeDynasty === dynasty.name
                      ? "bg-[#1A1A1A] text-white font-medium shadow-sm"
                      : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-100/80"
                  }`}
                >
                  {dynasty.name}
                </button>
              ))}

            </div>
            {/* 下方：字体筛选 */}
            <div className="flex items-center justify-center space-x-2">

              {fontStyles.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => {
                      setActiveStyle(style);
                      fetchCopybookList(
                          1,
                          getCurrentDynastyId(),
                          style==="全部字体"  ?  undefined  :  style
                      );
                  }}
                  className={`px-4 py-2 text-sm transition-colors duration-150 rounded-sm cursor-pointer ${
                    activeStyle === style
                      ? "bg-[#C83C2C] text-white font-medium shadow-sm"
                      : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-100/80"
                  }`}
                >
                  {style}
                </button>
              ))}

            </div>
          </div>
        </HeroContent> 
      </div>
      
      {/* <hr className=" opacity-10" /> */}
      {/* 碑帖列表瀑布流展示 */}
      <HeroContent height="auto" backgroundColor="#FFFBEB">
        <div ref={waterfallRef}>
          <CopybookWaterfall list={copybookList} />
        </div>
        <div className="flex justify-center items-center mt-10 pb-10">
            <Pagination
                className="copybook-pagination"
                current={current}
                pageSize={pageSize}
                total={total}
                onChange={(page)=>{
                  fetchCopybookList(
                      page,
                      getCurrentDynastyId(),
                      getCurrentStyle()
                  );
                }}
            />
            <span className="ml-4 text-sm text-gray-500">
                第 {current} 页 / 共 {Math.ceil(total / pageSize)} 页
            </span>
        </div>
      </HeroContent>
    </div>
  );
};

export default CopyBook;