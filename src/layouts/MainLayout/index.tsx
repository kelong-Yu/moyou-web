
import { Outlet,ScrollRestoration } from "react-router-dom";
import HeaderMenu from "../../components/HeaderMenu";
import FooterMenu from "../../components/FooterMenu";

const MainLayout = () => {
    return (
        <div className="w-100%">

            <ScrollRestoration />
            <HeaderMenu />
            
            <Outlet />

            <FooterMenu />
        </div>
    )
}

export default MainLayout;