import { createBrowserRouter } from "react-router-dom";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";
import MainLayout from "../layouts/MainLayout";
import CopyBook from "../pages/CopyBook";
import Map from "../pages/Map";
import CopybookDetails from "../pages/CopybookDetails";
import AritcleWorks from "../pages/ArticleWorks";
import SearchPage from "../pages/SearchPage";
import XiaoMoAgent from "../pages/XiaoMoAgent";
import CopybookPractise from "../pages/CopybookPractise";
import Dictionary from "../pages/Dictionary";
import RequireLogin from "../components/RequireLogin";
import UserProfile from "../pages/UserProfile";
import UserSettingsLayout from "../pages/UserSettings/UserSettingsLayout";
import ProfileSettings from "../pages/UserSettings/ProfileSettings";
import VisitHistorySettings from "../pages/UserSettings/VisitHistorySettings";
import MessageSettings from "../pages/UserSettings/MessageSettings";
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
                // 小墨Agent：仅登录用户可用（路由级登录守卫，
                // 未登录不再闪现页面残影）
                path: "/agent",
                element: (
                    <RequireLogin prompt="请先登录后再使用小墨 AI">
                        <XiaoMoAgent />
                    </RequireLogin>
                )
            },
            {
                path: "/copybook/:id",
                element: <CopybookDetails />
            },
            {
                // 单字临帖页：仅登录用户可访问（路由级登录守卫，
                // 直接输入地址或新窗口打开同样会被拦截到登录页）
                path: "/copybook/:id/practise",
                element: (
                    <RequireLogin>
                        <CopybookPractise />
                    </RequireLogin>
                )
            },
            {
                path: "/aritcleWorks/:id",
                element: <AritcleWorks />
                
            },
            {
                // 书法字典：公共页，游客可访问
                path: "/dictionary",
                element: <Dictionary />
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
        path: "/forgot-password",
        element: <ForgotPassword />
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
                element: <MessageSettings />
            },
            {
                path: "history",
                element: <VisitHistorySettings />
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