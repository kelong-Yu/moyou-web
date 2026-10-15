import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { App, Button, Input, Select, Spin } from "antd";
import { EditOutlined,KeyOutlined, } from "@ant-design/icons";
import UserAvatar from "../../components/UserAvatar";
import ChangePasswordModal from "./ChangePasswordModal";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../stores";
import { setUserInfo } from "../../stores/slices/userSlice";
import { currentUser, updateOwnProfile } from "../../services/user/api";

/** 可编辑表单字段 */
interface ProfileFormState {
    username: string;
    phone: string;
    signature: string;
    gender?: number;
}

/**
 * 个人设置 · 个人资料（基本信息）
 *
 * 布局结构：
 *   「个人资料」卡片（右上编辑按钮）
 *     ├─ 资料块：头像 + 昵称 / 邮箱 / 角色·状态 / 加入时间·IP 地址
 *     ├─ 可编辑区：昵称 / 手机号码 / 个人简介 / 性别（默认只读）
 *     └─ 安全设置：修改密码（占位）
 */
const ProfileSettings = () => {
    const navigate = useNavigate();
    const { message } = App.useApp();
    const dispatch = useDispatch();

    // Redux 中的用户信息（编辑保存后同步刷新）
    const reduxUser = useSelector((state: RootState) => state.user.userInfo);

    const [profile, setProfile] = useState<API.CurrentUser>();
    const [loading, setLoading] = useState(true);

    /** 是否处于编辑模式（默认只读） */
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    /** 修改密码弹窗 */
    const [pwdModalOpen, setPwdModalOpen] = useState(false);

    const [form, setForm] = useState<ProfileFormState>({
        username: "",
        phone: "",
        signature: "",
        gender: undefined,
    });

    // ==================== 数据加载 ====================
    useEffect(() => {
        let cancelled = false;

        setLoading(true);

        currentUser()
            .then((res: any) => {
                if (cancelled) return;
                if (res.code === 200) {
                    setProfile(res.data);
                } else if (res.code === 4001) {
                    message.info("请先登录");
                    navigate("/login");
                }
            })
            .catch(() => {
                // 请求失败时回退 Redux 数据（仅在有数据时）
                if (!cancelled && reduxUser) setProfile(reduxUser);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ==================== 展示字段 ====================
    const displayName = profile?.username || profile?.userAccount || "墨友";
    const roleText =
        profile?.role === 1
            ? "管理员"
            : profile?.role === 2
            ? "VIP 会员"
            : "普通用户";
    const statusText =
        profile?.status == null || profile.status === 0 ? "正常" : "已禁用";
    const joinTimeText = profile?.createTime
        ? String(profile.createTime).slice(0, 10).replace(/-/g, "/")
        : "未知";
    const genderText =
        profile?.gender === 1 ? "男" : profile?.gender === 2 ? "女" : "未设置";

    // ==================== 编辑处理 ====================
    const startEdit = () => {
        setForm({
            username: profile?.username || "",
            phone: profile?.phone || "",
            signature: profile?.signature || "",
            gender:
                profile?.gender === 1 || profile?.gender === 2
                    ? profile.gender
                    : undefined,
        });
        setEditing(true);
    };

    const cancelEdit = () => {
        setEditing(false);
    };

    const handleSave = () => {
        if (!form.username.trim()) {
            message.warning("昵称不能为空");
            return;
        }
        if (form.phone && !/^1[3-9]\d{9}$/.test(form.phone)) {
            message.warning("手机号格式不正确");
            return;
        }
        if (form.signature && form.signature.length > 200) {
            message.warning("个人简介长度不能超过200个字符");
            return;
        }

        setSaving(true);

        updateOwnProfile({
            username: form.username.trim(),
            phone: form.phone.trim() || undefined,
            signature: form.signature.trim() || undefined,
            gender: form.gender,
        })
            .then((res: any) => {
                if (res.code === 200) {
                    // 以服务端返回刷新资料与 Redux（导航栏昵称同步更新）
                    setProfile(res.data);
                    if (res.data) dispatch(setUserInfo(res.data));
                    setEditing(false);
                    message.success("保存成功");
                } else if (res.code === 4001) {
                    message.info("请先登录");
                    navigate("/login");
                } else {
                    message.error(res.message || "保存失败，请稍后重试");
                }
            })
            .catch(() => {
                message.error("保存失败，请稍后重试");
            })
            .finally(() => {
                setSaving(false);
            });
    };

    // ==================== 渲染 ====================
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-6">
            {/* 卡片头：标题 + 编辑按钮 */}
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-[#3F332A]">个人资料</h2>

                {editing ? (
                    <div className="flex items-center gap-2">
                        <Button onClick={cancelEdit} disabled={saving}>
                            取消
                        </Button>
                        <Button
                            type="primary"
                            loading={saving}
                            onClick={handleSave}
                            className="!bg-[#964328]"
                        >
                            保存
                        </Button>
                    </div>
                ) : (
                    <Button
                        icon={<EditOutlined />}
                        onClick={startEdit}
                        className="!rounded-lg !border-[#964328]/40 !text-[#964328] hover:!border-[#964328] hover:!text-[#964328]"
                    >
                        编辑资料
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="py-16 text-center">
                    <Spin size="large" />
                </div>
            ) : (
                <>
                    {/* ---------- 资料块：头像 + 基本信息 ---------- */}
                    <div className="rounded-xl bg-[#F7F0E2]/60 border border-[#964328]/10 p-5 flex items-center gap-5">
                        <UserAvatar
                            size={64}
                            src={profile?.avatarUrl}
                            account={profile?.userAccount}
                            name={profile?.username}
                            className="shrink-0 font-semibold"
                        />

                        <div className="min-w-0 space-y-1">
                            <p className="text-lg font-bold text-gray-900 leading-tight">
                                {displayName}
                            </p>

                            <p className="text-sm text-gray-600 truncate">
                                邮箱：{profile?.email || profile?.userAccount || "未绑定"}
                            </p>

                            <p className="text-xs text-gray-500">
                                {roleText} · {statusText}
                            </p>

                            <p className="text-xs text-gray-400">
                                加入时间：{joinTimeText} · IP 地址：暂无记录
                            </p>
                        </div>
                    </div>

                    {/* ---------- 可编辑信息区（默认只读） ---------- */}
                    <div className="mt-5 rounded-xl border border-gray-100 divide-y divide-gray-100">
                        {/* 昵称 */}
                        <div className="flex items-center justify-between gap-4 px-5 py-4">
                            <span className="text-sm text-gray-500 shrink-0">昵称</span>
                            {editing ? (
                                <Input
                                    value={form.username}
                                    maxLength={30}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            username: e.target.value,
                                        }))
                                    }
                                    className="!w-64 !text-right"
                                    placeholder="请输入昵称"
                                />
                            ) : (
                                <span className="text-sm text-gray-800 text-right">
                                    {profile?.username || profile?.userAccount || "未设置"}
                                </span>
                            )}
                        </div>

                        {/* 手机号码 */}
                        <div className="flex items-center justify-between gap-4 px-5 py-4">
                            <span className="text-sm text-gray-500 shrink-0">手机号码</span>
                            {editing ? (
                                <Input
                                    value={form.phone}
                                    maxLength={11}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            phone: e.target.value,
                                        }))
                                    }
                                    className="!w-64 !text-right"
                                    placeholder="请输入手机号码"
                                />
                            ) : (
                                <span className="text-sm text-gray-800 text-right">
                                    {profile?.phone || "未绑定"}
                                </span>
                            )}
                        </div>

                        {/* 个人简介 */}
                        <div className="flex items-start justify-between gap-4 px-5 py-4">
                            <span className="text-sm text-gray-500 shrink-0 pt-1">个人简介</span>
                            {editing ? (
                                <Input.TextArea
                                    value={form.signature}
                                    maxLength={200}
                                    autoSize={{ minRows: 2, maxRows: 4 }}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            signature: e.target.value,
                                        }))
                                    }
                                    className="!w-72"
                                    placeholder="介绍一下自己吧（最多200字）"
                                />
                            ) : (
                                <span className="text-sm text-gray-800 text-right max-w-md">
                                    {profile?.signature || "未设置"}
                                </span>
                            )}
                        </div>

                        {/* 性别 */}
                        <div className="flex items-center justify-between gap-4 px-5 py-4">
                            <span className="text-sm text-gray-500 shrink-0">性别</span>
                            {editing ? (
                                <Select
                                    value={
                                        form.gender === 1 || form.gender === 2
                                            ? form.gender
                                            : undefined
                                    }
                                    allowClear
                                    placeholder="未设置"
                                    className="!w-64"
                                    options={[
                                        { value: 1, label: "男" },
                                        { value: 2, label: "女" },
                                    ]}
                                    onChange={(value) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            gender: value,
                                        }))
                                    }
                                />
                            ) : (
                                <span className="text-sm text-gray-800 text-right">
                                    {genderText}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* ---------- 安全设置（占位） ---------- */}
                    <div className="mt-5 rounded-xl border border-gray-100 p-5">
                        <h3 className="text-base font-bold text-[#3F332A] mb-3">
                            安全设置
                        </h3>

                        <div className="flex items-center justify-between gap-4 py-1">
                            <div>
                                <p className="text-sm text-gray-700">修改密码</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    定期更换密码以保障账户安全
                                </p>
                            </div>

                            <Button className="!rounded-lg !border-[#964328]/40 !text-[#964328] hover:!border-[#964328] hover:!text-[#964328]"
                                icon={<KeyOutlined />}
                                onClick={() => setPwdModalOpen(true)}>
                                修改密码
                            </Button>
                        </div>
                    </div>
                </>
            )}

            {/* 修改密码弹窗 */}
            <ChangePasswordModal
                open={pwdModalOpen}
                onClose={() => setPwdModalOpen(false)}
            />
        </div>
    );
};

/** 昵称展示逻辑已内联到组件派生数据 displayName 中（username → userAccount → 墨友） */

export default ProfileSettings;
