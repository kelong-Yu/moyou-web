import { Dropdown, App } from "antd";
import type { MenuProps } from "antd";
import { 
    CreditCardOutlined, 
    SettingOutlined, 
    HistoryOutlined, 
    MessageOutlined,
    KeyOutlined, 
    LogoutOutlined,
    DownOutlined,
    UpOutlined,
    HomeOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { outLogin } from "../../services/user/api";
import { getMessageUnreadCounts } from "../../services/message/api";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../stores";
import { clearUserInfo } from "../../stores/slices/userSlice";
import { useEffect, useState } from "react";
import UserAvatar from "../UserAvatar";


interface UserDropdownProps {
    isDarkHeader: boolean;
    /**
     * 展示模式：
     * default → 完整菜单（个人功能全量，用于顶部导航栏）
     * compact → 精简菜单（我的主页 / 回到首页 / 退出登录，用于个人设置页）
     */
    variant?: "default" | "compact";
}

const UserDropdown = ({isDarkHeader, variant = "default"}:UserDropdownProps) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { message } = App.useApp();
    const [open, setOpen] = useState(false);

    // 从 Redux 获取当前用户
    const userInfo = useSelector((state: RootState) => state.user.userInfo);

    /**
     * 「我的消息」未读红点（主题色，不带数字）：
     * 系统通知 + 互动消息任一存在未读即显示，两类全部已读后才消失。
     * 打开下拉菜单时重新拉取，保证在消息页操作后即时更新。
     */
    const [hasUnreadMessage, setHasUnreadMessage] = useState(false);

    const refreshUnreadDot = () => {
        if (!userInfo) {
            setHasUnreadMessage(false);
            return;
        }
        getMessageUnreadCounts()
            .then((res: any) => {
                if (res.code === 200 && res.data) {
                    setHasUnreadMessage(
                        (res.data.announcementUnread || 0) +
                            (res.data.commentUnread || 0) >
                            0
                    );
                }
            })
            .catch(() => {
                // 拉取失败不影响菜单正常使用
            });
    };

    useEffect(() => {
        refreshUnreadDot();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userInfo]);

    // 渲染用户角色标签（0: 普通用户, 1: 管理员, 2: 会员）
    const renderRoleTag = () => {
        const role = userInfo?.role;
        if (role === 1 || role === 2) {
            const roleText = role === 1 ? "管理员" : "VIP 会员";
            return (
                <div className="relative overflow-hidden inline-flex items-center gap-1 px-1.5 py-[1px] rounded text-[10px] font-semibold bg-gradient-to-r from-[#211E1B] via-[#2D2823] to-[#181614] border border-[#E6C594]/40 shadow-xs mt-1 w-fit group">
                    {/* 2秒流光动效 */}
                    <div 
                        className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" 
                        style={{ transform: 'skewX(-20deg)' }}
                    />
                    
                    {/* 星星点缀 */}
                    <svg className="w-2.5 h-2.5 text-[#FFD700] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
                    </svg>

                    {/* 文字颜色渐变 */}
                    <span className="bg-gradient-to-r from-[#FFE5B4] via-[#FFC870] to-[#E6A15C] bg-clip-text text-transparent font-bold tracking-wider relative z-10">
                        {roleText}
                    </span>
                </div>
            );
        }
        return <span className="text-xs text-gray-400 mt-1">普通用户</span>;
    };

    const fullItems: MenuProps["items"] = [
        // 1. 顶部用户信息
        {
            key: "user-header",
            disabled: true,
            className: "cursor-default !bg-transparent hover:!bg-transparent !p-0",
            label: (
                <div className="flex items-center gap-3 px-3 py-2">
                    <UserAvatar 
                        size={42} 
                        src={userInfo?.avatarUrl} 
                        account={userInfo?.userAccount}
                        name={userInfo?.username}
                        className="shrink-0 font-semibold"
                    />
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold text-gray-900 text-sm leading-tight truncate">
                            {userInfo?.username || userInfo?.userAccount || "luck"}
                        </span>
                        {renderRoleTag()}
                    </div>
                </div>
            ),
        },
        // 第一处分割线：极淡、若隐若现
        {
            type: "divider",
            className: "!my-1 !mx-2 !border-black/[0.02]",
        },
        // 2. 个人功能小标题
        {
            key: "section-title",
            disabled: true,
            className: "cursor-default !bg-transparent hover:!bg-transparent !py-1 !px-3",
            label: <span className="text-xs text-gray-400 font-normal">个人功能</span>,
        },
        
        // 3. 功能列表项
        {
            key: "profile",
            label: <span className="text-gray-700">我的主页</span>,
            icon: <CreditCardOutlined className="text-gray-600 text-base" />,
            className: "!py-2.2 !my-1 !px-4 !text-sm",
        },
        {
            key: "/settings/profile",
            label: <span className="text-gray-700">个人设置</span>,
            icon: <SettingOutlined className="text-gray-600 text-base" />,
            className: "!py-2.2 !my-1 !px-4 !text-sm",
        },
        {
            key: "history",
            label: <span className="text-gray-700">浏览历史</span>,
            icon: <HistoryOutlined className="text-gray-600 text-base" />,
            className: "!py-2.2 !my-1 !px-4 !text-sm",
        },
        {
            key: "mymessage",
            label: (
                <span className="text-gray-700 flex items-center justify-between gap-2">
                    <span>我的消息</span>
                    {hasUnreadMessage && (
                        <span className="inline-block w-2 h-2 rounded-full bg-[#964328]" />
                    )}
                </span>
            ),
            icon: <MessageOutlined className="text-gray-600 text-base" />,
            className: "!py-2.2 !my-1 !px-4 !text-sm",
        },
        {
            key: "apiKey",
            label: <span className="text-gray-700">API 密钥</span>,
            icon: <KeyOutlined className="text-gray-600 text-base" />,
            className: "!py-2.2 !my-1 !mb-3 !px-4 !text-sm",
        },
        // 第二处分割线：极淡、若隐若现
        {
            type: "divider",
            className: "!my-1 !mx-3 !border-black/[0.02]",
        },
        // 5. 退出登录
        {
            key: "logout",
            danger: true,
            label: <span className="font-medium">退出登录</span>,
            icon: <LogoutOutlined className="text-base" />,
            className: "!py-3 !px-4 text-sm mt-2 hover:!bg-red-50 transition-colors",
        },
    ];

    // 精简模式（个人设置页右上角）：我的主页 / 回到首页 / 退出登录
    const compactItems: MenuProps["items"] = [
        {
            key: "profile",
            label: <span className="text-gray-700">我的主页</span>,
            icon: <CreditCardOutlined className="text-gray-600 text-base" />,
            className: "!py-2.2 !my-1 !px-4 !text-sm",
        },
        {
            key: "home",
            label: <span className="text-gray-700">回到首页</span>,
            icon: <HomeOutlined className="text-gray-600 text-base" />,
            className: "!py-2.2 !my-1 !px-4 !text-sm",
        },
        {
            type: "divider",
            className: "!my-1 !mx-3 !border-black/[0.02]",
        },
        {
            key: "logout",
            danger: true,
            label: <span className="font-medium">退出登录</span>,
            icon: <LogoutOutlined className="text-base" />,
            className: "!py-3 !px-4 text-sm mt-2 hover:!bg-red-50 transition-colors",
        },
    ];

    const items: MenuProps["items"] =
        variant === "compact" ? compactItems : fullItems;

    const handleMenuClick: MenuProps["onClick"] = async ({ key }) => {
        if (key === "user-header" || key === "section-title") return;

        setOpen(false);

        if (key === "profile") {
            navigate("/profile");
        } else if (key === "home") {
            navigate("/");
        } else if (key === "/settings/profile") {
            // 个人设置 → 个人中心·个人资料
            navigate("/settings/profile");
        } else if (key === "history") {
            // 浏览历史 → 个人中心·浏览历史
            navigate("/settings/history");
        } else if (key === "mymessage") {
            // 我的消息 → 个人中心·我的消息
            navigate("/settings/messages");
        } else if (key === "apiKey") {
            // API 密钥 → 个人中心·API 密钥
            navigate("/settings/api-key");
        } else if (key === "logout") {
            try {
                await outLogin();
            } finally {
                localStorage.removeItem("token");
                dispatch(clearUserInfo());
                navigate("/", { replace: true });
                message.success("退出成功");
            }
        }
    };

    if (!userInfo) {
        return (
            <button
                type="button"
                onClick={() => { navigate("/login"); }}
                className="bg-[#B85C47] hover:bg-[#A34F3C] text-white p-2.5 rounded-lg shadow transition-colors flex items-center justify-center px-4 py-2"
            >
                登录
            </button>
        );
    }

    return (
        <Dropdown
            menu={{
                items,
                onClick: handleMenuClick,
                className: "w-66 p-2 rounded-xl border-none shadow-lg bg-[#fcfbf9]/95 backdrop-blur-md [&_.ant-dropdown-menu-item-danger_.ant-dropdown-menu-item-icon]:!text-[#dc2626] [&_.ant-dropdown-menu-item-danger]:!text-[#dc2626]",
            }}
            placement="bottomRight"
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                // 每次打开菜单刷新未读红点（消息页操作后即时反映）
                if (nextOpen) refreshUnreadDot();
            }}
        >
            <div className="flex items-center gap-2 cursor-pointer select-none py-1 px-2">
                <UserAvatar
                    size={32}
                    src={userInfo?.avatarUrl}
                    account={userInfo?.userAccount}
                    name={userInfo?.username}
                    className="flex-shrink-0 font-semibold"
                />
                <span
                    className={`text-base font-normal leading-none flex items-center transition-colors duration-300 ${
                        isDarkHeader ? "text-white" : "text-[#454B58]"
                    }`}
                >
                    {userInfo?.username || userInfo?.userAccount}
                </span>
                <span className="inline-flex items-center justify-center text-xs">
                    {open ? (
                        <UpOutlined
                            className={`!mt-1 transition-colors duration-300 ${
                                isDarkHeader ? "!text-white" : "!text-[#454B58]"
                            }`}
                        />
                    ) : (
                        <DownOutlined
                            className={`!mt-1 transition-colors duration-300 ${
                                isDarkHeader ? "!text-white" : "!text-[#454B58]"
                            }`}
                        />
                    )}
                </span>
            </div>
        </Dropdown>
    );
};

export default UserDropdown;