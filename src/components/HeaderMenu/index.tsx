import React, { useState, useEffect } from "react";
import { Image } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import {
  HomeOutlined,
  BookOutlined,
  CompassOutlined,
  RobotOutlined,
  EditOutlined,
  EllipsisOutlined,
} from "@ant-design/icons";
import UserDropdown from "../../components/UserDropdown";
import moyouLogo from "../../assets/moyoulogo.png";



const HeaderMenu: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 1. 滚动状态
  const [isScrolled, setIsScrolled] = useState(false);

  // 2. 配置需要深色/红底背景的路由前缀（不需要加 * 通配符）
  // 注意：以这些路径开头的页面（例如 /aritcleWorks/27）都会生效
  const darkPagePrefixes = ["/map", "/master", "/copybook", "/aritcleWorks","/search"];

  // 3. 使用 startsWith 进行前缀匹配
  const isDarkHeader =
    isScrolled ||
    darkPagePrefixes.some((prefix) => location.pathname.startsWith(prefix));

  useEffect(() => {
    const handleScroll = () => {
      // 滚动超过 100px 切换样式
      if (window.scrollY > 100) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // 菜单配置
  const menus = [
    { key: "/", label: "首页", icon: <HomeOutlined /> },
    { key: "/copybook", label: "碑帖字库", icon: <BookOutlined /> },
    { key: "/map", label: "书家列传", icon: <CompassOutlined /> },
    { key: "/agent", label: "小墨Agent", icon: <RobotOutlined /> },
    { key: "/practise", label: "书法字典", icon: <EditOutlined /> },
    { key: "/more", label: "更多", icon: <EllipsisOutlined /> },
  ];

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 flex items-center justify-between px-8 py-3 select-none transition-all duration-300 ${
        isDarkHeader
          ? "bg-[#964328] " // 下拉/深色页：主题赭红色背景 + 白色文字
          : "bg-transparent" // 顶端默认：透明背景
      }`}
    >
      {/* 左侧 Logo + 导航菜单 */}
      <div className="flex items-center space-x-6">
        {/* Logo */}
        <div
          className="cursor-pointer flex items-center mr-3"
          onClick={() => navigate("/")}
        >
          <Image
            src={moyouLogo}
            alt="Logo"
            preview={false}
            style={{ width: 65, height: "auto" }}
            className={isDarkHeader ? "brightness-0 invert" : ""}
          />
        </div>

        {/* 导航菜单项 */}
        <nav className="flex items-center space-x-1">
          {menus.map((item) => {
            const isActive = location.pathname === item.key;
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.key)}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-[16px] transition-all duration-200 cursor-pointer border-none ${
                  isDarkHeader
                    ? // 【深色/红底样式】
                      isActive
                      ? "text-white font-bold"
                      : "text-white/80 hover:text-white hover:bg-white/10 bg-transparent"
                    : // 【透明背景默认样式】
                      isActive
                      ? "text-[#964328] font-bold bg-transparent"
                      : "text-gray-700 hover:text-[#964328] hover:bg-black/5 bg-transparent"
                }`}
              >
                <span className="text-base flex items-center">{item.icon}</span>
                <span className="tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 右侧用户下拉信息 */}
      <div
        className={`flex items-center transition-colors duration-300 ${
          isDarkHeader ? "text-white" : "text-gray-800"
        }`}
      >
        <UserDropdown isDarkHeader={isDarkHeader} />
      </div>
    </header>
  );
};

export default HeaderMenu;