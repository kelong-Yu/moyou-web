import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button, Empty } from "antd";
import {
    UserOutlined,
    MessageOutlined,
    HistoryOutlined,
    KeyOutlined,
    SettingOutlined,
} from "@ant-design/icons";
import type { RootState } from "../../stores";
import UserDropdown from "../../components/UserDropdown";
import { usePageMeta } from "../../hooks/usePageMeta";
import moyouLogo from "../../assets/moyouLogo.png";

/** 侧边导航配置（与路由一一对应） */
const MENU_ITEMS = [
    { key: "/settings/profile", label: "个人资料", icon: <UserOutlined /> },
    { key: "/settings/messages", label: "我的消息", icon: <MessageOutlined /> },
    { key: "/settings/history", label: "浏览历史", icon: <HistoryOutlined /> },
    { key: "/settings/api-key", label: "API 密钥", icon: <KeyOutlined /> },
    { key: "/settings/homepage", label: "主页设置", icon: <SettingOutlined /> },
];

/** 面包屑第二级文案 */
const CRUMB_TEXT: Record<string, string> = {
    "/settings/profile": "个人资料",
    "/settings/messages": "我的消息",
    "/settings/history": "浏览历史",
    "/settings/api-key": "API 密钥",
    "/settings/homepage": "主页设置",
};

/** 前端展示版本号（侧边栏底部，发版时手动更新） */
const APP_VERSION = "v1.0.0";

/**
 * 个人设置布局（整页铺满）
 *
 * 左侧：固定全高侧边栏（墨友 logo + 个人设置标题 + 操作导航 + 底部版本号）
 * 右侧：顶栏（面包屑 + UserDropdown compact 模式）+ 铺满剩余高度的内容区
 *
 * /settings 子路由：
 *   /settings/profile   个人资料（已实现）
 *   /settings/messages  我的消息（占位）
 *   /settings/history   浏览历史（占位）
 *   /settings/api-key   API 密钥（占位）
 *   /settings/homepage  主页设置（占位）
 */
const UserSettingsLayout = () => {
    const userInfo = useSelector((state: RootState) => state.user.userInfo);
    const location = useLocation();
    const navigate = useNavigate();

    const secondCrumb = CRUMB_TEXT[location.pathname];

    // 页面标题（设置页不记录浏览历史，避免设置页自身写入历史）
    usePageMeta({
        title: secondCrumb || "个人设置",
        record: false,
    });

    // 未登录：不展示任何伪造信息，引导登录
    if (!userInfo) {
        return (
            <div className="min-h-screen bg-[#F6F7F9] pt-32 text-center">
                <Empty description="登录后才能进入个人设置" />
                <Button
                    type="primary"
                    className="mt-6 bg-[#964328]"
                    onClick={() => navigate("/login")}
                >
                    去登录
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F6F7F9] font-sans">
            {/* ==================== 左侧固定全高侧边栏 ==================== */}
            <aside className="fixed inset-y-0 left-0 z-10 flex w-60 flex-col border-r border-gray-200/60 bg-white pl-9 pr-4">
                {/* 墨友 logo */}
                <div className="flex h-16 shrink-0 items-center">
                    <img
                        src={moyouLogo}
                        alt="墨友"
                        className="h-7 w-auto cursor-pointer"
                        onClick={() => navigate("/")}
                    />
                </div>

                {/* 个人设置标题 */}
                <div className="pt-3 pb-2 text-xs text-gray-400">
                    个人设置
                </div>

                {/* 操作导航 */}
                <nav className="space-y-1">
                    {MENU_ITEMS.map((item) => {
                        const isActive = location.pathname === item.key;

                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => navigate(item.key)}
                                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm cursor-pointer border-0 bg-transparent transition-colors ${
                                    isActive
                                        ? "bg-[#964328]/10 text-[#964328] font-semibold"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-[#3F332A]"
                                }`}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* 底部版本号 */}
                <div className="mt-auto py-4 text-xs text-gray-300">
                    版本 {APP_VERSION}
                </div>
            </aside>

            {/* ==================== 右侧：顶栏 + 内容区 ==================== */}
            <div className="ml-60 flex min-h-screen flex-col">
                {/* 顶栏：面包屑 + 用户下拉（复用组件，compact 模式），滚动时吸顶固定 */}
                <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-gray-200/50 bg-[#F6F7F9]/90 px-8 backdrop-blur">
                    <nav className="text-sm text-gray-400 flex items-center gap-1.5">
                        <span>个人设置</span>
                        <span className="text-gray-300">/</span>
                        {secondCrumb ? (
                            <>
                                <span className="text-gray-500">
                                    {secondCrumb}
                                </span>
                                {location.pathname ===
                                    "/settings/profile" && (
                                    <>
                                        <span className="text-gray-300">/</span>
                                        <span className="text-gray-700 font-medium">
                                            基本信息
                                        </span>
                                    </>
                                )}
                            </>
                        ) : null}
                    </nav>

                    <UserDropdown isDarkHeader={false} variant="compact" />
                </header>

                {/* 子页面（铺满剩余宽度与高度） */}
                <main className="flex-1 px-8 pt-6 pb-8">
                    <div key={location.pathname} className="profile-fade-in">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default UserSettingsLayout;
