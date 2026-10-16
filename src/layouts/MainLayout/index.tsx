
import { Outlet,ScrollRestoration, useLocation } from "react-router-dom";
import HeaderMenu from "../../components/HeaderMenu";
import FooterMenu from "../../components/FooterMenu";

/** 全屏应用页：自带页尾 AI 声明，不渲染站点页脚 */
const FULLSCREEN_PATHS = ["/agent"];

const MainLayout = () => {

    const location = useLocation();

    const showFooter = !FULLSCREEN_PATHS.some(
        path => location.pathname.startsWith(path)
    );

    return (
        <div className="w-100%">

            <ScrollRestoration />
            <HeaderMenu />

            <Outlet />

            {showFooter && <FooterMenu />}
        </div>
    )
}

export default MainLayout;
