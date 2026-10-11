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
    }

])

export default router;