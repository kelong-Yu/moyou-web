import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App } from "antd";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../stores";
import { setUserInfo } from "../../stores/slices/userSlice";
import { currentUser } from "../../services/user/api";
import MoyouLoading from "../MoyouLoading";

export interface RequireLoginProps {
    children: ReactNode;

    /**
     * 未登录时的提示文案
     *
     * 默认「请先登录后再访问该页面」，
     * 可按页面语义定制（如「请先登录后再使用小墨 AI」）。
     */
    prompt?: string;
}

/**
 * 登录守卫
 *
 * 包裹仅登录用户可访问的页面（当前用于单字临帖页），
 * 路由级拦截，直接输入地址 / 新窗口打开同样生效。
 *
 * 判定逻辑（token 是新窗口场景下唯一即时可用的凭据信号，
 * Redux 会话由 AuthProvider 异步恢复，不能作为唯一依据）：
 *
 * 1. localStorage 无 token → 确定未登录，
 *    提示后跳转登录页，并用 ?redirect= 带回原地址；
 * 2. 有 token 但 Redux 尚无用户（刷新 / 新窗口）→
 *    调 currentUser 以服务端为准校验会话：
 *    通过则写入 Redux 并放行；失败清除失效 token 并去登录页；
 * 3. 校验期间渲染 MoyouLoading 占位，未登录内容不会闪现；
 * 4. 页面停留期间会话丢失（如导航栏退出登录）→ 送回登录页。
 */
const RequireLogin = ({
    children,
    prompt = "请先登录后再访问该页面",
}: RequireLoginProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { message } = App.useApp();
    const dispatch = useDispatch();

    const userInfo = useSelector((state: RootState) => state.user.userInfo);

    /** 跳转登录页，携带当前地址供登录后回跳 */
    const goToLogin = () => {
        const back = encodeURIComponent(
            `${location.pathname}${location.search}`
        );
        navigate(`/login?redirect=${back}`, { replace: true });
    };

    // 挂载时：无 token 直接去登录页；有 token 则以服务端会话为准校验
    useEffect(() => {
        if (userInfo) return;

        if (!localStorage.getItem("token")) {
            message.info(prompt);
            goToLogin();
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const res = (await currentUser()) as API.Result<
                    API.CurrentUser
                >;

                if (cancelled) return;

                if (res.code === 200 && res.data) {
                    // 会话有效：写入 Redux，本组件随即放行
                    dispatch(setUserInfo(res.data));
                } else {
                    localStorage.removeItem("token");
                    message.info("登录状态已失效，请重新登录");
                    goToLogin();
                }
            } catch {
                if (cancelled) return;
                localStorage.removeItem("token");
                message.info("登录状态已失效，请重新登录");
                goToLogin();
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 会话恢复完成前保持占位；停留期间退出登录（userInfo 变空且无 token）也送回登录页
    useEffect(() => {
        if (!userInfo && !localStorage.getItem("token")) {
            goToLogin();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userInfo]);

    if (!userInfo) {
        return (
            <div className="min-h-[70vh] bg-[#FAF6ED]">
                <MoyouLoading tip="正在校验登录状态……" />
            </div>
        );
    }

    return <>{children}</>;
};

export default RequireLogin;
