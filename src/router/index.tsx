import { createBrowserRouter } from "react-router-dom";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import MainLayout from "../layouts/MainLayout";
import CopyBook from "../pages/CopyBook";
import Map from "../pages/Map";
import CopybookDetails from "../pages/CopybookDetails";
import AritcleWorks from "../pages/ArticleWorks";
import SearchPage from "../pages/SearchPage";
import XiaoMoAgent from "../pages/XiaoMoAgent";
import CopybookPractise from "../pages/CopybookPractise";
import UserProfile from "../pages/UserProfile";
import UserSettingsLayout from "../pages/UserSettings/UserSettingsLayout";
import ProfileSettings from "../pages/UserSettings/ProfileSettings";
import SettingsPlaceholder from "../pages/UserSettings/SettingsPlaceholder";
import { Navigate } from "react-router-dom";

const router = createBrowserRouter([
    {
        path:"/",
        element:<MainLayout/>,
        children:[
            {
                index:true,
                element:<Home/>
            },
            {
                path: "/copybook",
                element: <CopyBook />
            },
            {
                path: "/map",
                element: <Map />
            },
            {
                path: "/agent",
                element: <XiaoMoAgent />
            },
            {
                path: "/copybook/:id",
                element: <CopybookDetails />
            },
            {
                path: "/copybook/:id/practise",
                element: <CopybookPractise />
            },
            {
                path: "/aritcleWorks/:id",
                element: <AritcleWorks />
                
            },
            {
                path: "/search",
                element: <SearchPage />
            },
            {
                // 个人主页（默认查看当前登录用户）
                path: "/profile",
                element: <UserProfile />
            },
            {
                // 查看其他用户的个人主页
                path: "/user/:id",
                element: <UserProfile />
            }
        ]
    },
    {
        path: "/login",
        element: <Login />
    },
    {
        path: "/register",
        element: <Register />
    },
    {
        // 个人中心（独立布局：左侧导航 + 面包屑 + 用户下拉）
        path: "/settings",
        element: <UserSettingsLayout />,
        children: [
            { index: true, element: <Navigate to="/settings/profile" replace /> },
            {
                path: "profile",
                element: <ProfileSettings />
            },
            {
                path: "messages",
                element: <SettingsPlaceholder title="我的消息" />
            },
            {
                path: "history",
                element: <SettingsPlaceholder title="浏览历史" />
            },
            {
                path: "api-key",
                element: <SettingsPlaceholder title="API 密钥" />
            },
            {
                path: "homepage",
                element: <SettingsPlaceholder title="主页设置" />
            }
        ]
    }

])

export default router;