import React, { useState, useEffect } from "react";
import { Image, Drawer, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BookOutlined,
  CompassOutlined,
  RobotOutlined,
  EditOutlined,
  EllipsisOutlined,
  MenuOutlined,
  CommentOutlined,
} from "@ant-design/icons";
import UserDropdown from "../../components/UserDropdown";
import FeedbackModal from "../../components/FeedbackModal";
import moyouLogo from "../../assets/moyoulogo.png";



const HeaderMenu: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 1. 滚动状态
  const [isScrolled, setIsScrolled] = useState(false);

  // 移动端菜单抽屉
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 反馈弹窗（挂在导航层，全站任意页面都能从「更多」进入）
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // 2. 配置需要深色/红底背景的路由前缀（不需要加 * 通配符）
  // 注意：以这些路径开头的页面（例如 /aritcleWorks/27）都会生效
  const darkPagePrefixes = ["/map", "/master", "/copybook", "/aritcleWorks","/search","/profile","/user","/dictionary"];

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

  // 菜单配置（「更多」不在这里，它是悬浮菜单不是路由）
  const menus = [
    { key: "/copybook", label: "碑帖字库", icon: <BookOutlined /> },
    { key: "/map", label: "书家列传", icon: <CompassOutlined /> },
    { key: "/dictionary", label: "书法字典", icon: <EditOutlined /> },
    { key: "/agent", label: "小墨Agent", icon: <RobotOutlined /> },
  ];

  /** 「更多」悬浮菜单的内容 */
  const moreMenuItems: MenuProps["items"] = [
    {
      key: "feedback",
      label: <span className="text-gray-700">反馈</span>,
      icon: <CommentOutlined className="text-gray-600 text-base" />,
    },
  ];

  /** 导航项与「更多」按钮共用同一套样式，保证两者观感完全一致 */
  const navItemClass = (isActive: boolean) =>
    `flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-[16px] transition-all duration-200 cursor-pointer border-none ${
      isDarkHeader
        ? // 【深色/红底样式】
          isActive
          ? "text-white font-bold"
          : "text-white/80 hover:text-white hover:bg-white/10 bg-transparent"
        : // 【透明背景默认样式】
          isActive
          ? "text-[#964328] font-bold bg-transparent"
          : "text-gray-700 hover:text-[#964328] hover:bg-black/5 bg-transparent"
    }`;

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 md:px-8 py-3 select-none transition-all duration-300 ${
        isDarkHeader
          ? "bg-[#964328] " // 下拉/深色页：主题赭红色背景 + 白色文字
          : "bg-transparent" // 顶端默认：透明背景
      }`}
    >
      {/* 左侧 Logo + 导航菜单 */}
      <div className="flex items-center space-x-2 md:space-x-6">
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

        {/* 导航菜单项（桌面端） */}
        <nav className="hidden md:flex items-center space-x-1">
          {menus.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => navigate(item.key)}
              className={navItemClass(location.pathname === item.key)}
            >
              <span className="text-base flex items-center">{item.icon}</span>
              <span className="tracking-wide">{item.label}</span>
            </button>
          ))}

          {/* 「更多」：悬浮展开菜单，本身不对应任何路由 */}
          <Dropdown
            menu={{
              items: moreMenuItems,
              onClick: ({ key }) => {
                if (key === "feedback") setFeedbackOpen(true);
              },
            }}
            trigger={["hover"]}
            placement="bottomLeft"
          >
            <button type="button" className={navItemClass(false)} aria-haspopup="menu">
              <span className="text-base flex items-center">
                <EllipsisOutlined />
              </span>
              <span className="tracking-wide">更多</span>
            </button>
          </Dropdown>
        </nav>

        {/* 移动端汉堡按钮 */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className={`md:hidden flex items-center justify-center p-2 rounded-md border-none cursor-pointer ${
            isDarkHeader
              ? "text-white hover:bg-white/10"
              : "text-gray-700 hover:bg-black/5"
          }`}
          aria-label="打开菜单"
        >
          <MenuOutlined className="text-xl" />
        </button>
      </div>

      {/* 右侧用户下拉信息 */}
      <div
        className={`flex items-center transition-colors duration-300 ${
          isDarkHeader ? "text-white" : "text-gray-800"
        }`}
      >
        <UserDropdown isDarkHeader={isDarkHeader} />
      </div>

      {/* 移动端菜单抽屉 */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        placement="left"
        width={240}
        title={<span className="font-serif font-bold">墨友菜单</span>}
      >
        <nav className="flex flex-col gap-1">
          {menus.map((item) => {
            const isActive = location.pathname === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  navigate(item.key);
                }}
                className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-md text-[15px] border-none cursor-pointer text-left ${
                  isActive
                    ? "bg-[#964328] text-white font-bold"
                    : "text-gray-700 hover:bg-black/5"
                }`}
              >
                <span className="flex items-center">{item.icon}</span>
                <span className="tracking-wide">{item.label}</span>
              </button>
            );
          })}

          {/* 移动端没有悬浮，反馈直接作为抽屉里的一项 */}
          <button
            type="button"
            onClick={() => {
              setDrawerOpen(false);
              setFeedbackOpen(true);
            }}
            className="flex items-center space-x-2.5 px-3 py-2.5 rounded-md text-[15px] border-none cursor-pointer text-left text-gray-700 hover:bg-black/5"
          >
            <span className="flex items-center">
              <CommentOutlined />
            </span>
            <span className="tracking-wide">反馈</span>
          </button>
        </nav>
      </Drawer>

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
    </header>
  );
};

export default HeaderMenu;