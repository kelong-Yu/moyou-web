import { Avatar } from "antd";
import type { AvatarProps } from "antd";

/**
 * 默认头像纯色色板（文字统一白色）。
 * 同一账号哈希后稳定取同一颜色，视觉上等效「随机纯色背景」。
 */
const AVATAR_PALETTE = [
    "#964328", // 主题赭红
    "#B85C47",
    "#A67C52",
    "#7A6A55",
    "#5C715E",
    "#4F6B78",
    "#6B5B95",
    "#8C5E52",
    "#566D77",
    "#7D5A50",
];

/** 字符串哈希（FNV 风格，结果稳定） */
const hashText = (value: string) => {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash;
};

interface UserAvatarProps extends Omit<AvatarProps, "src"> {
    /** 头像图片地址（为空时回退「纯色背景 + 首字母」） */
    src?: string;
    /** 账号（优先用于取首字母与配色） */
    account?: string;
    /** 昵称（账号缺失时使用） */
    name?: string;
}

/**
 * 统一用户头像
 *
 * 规则（全站唯一实现）：
 *   · 有头像图片 → 直接展示图片；
 *   · 无图片 → 纯色背景（按账号哈希从色板稳定取色）+ 账号首字母大写；
 *   · 首字符不是英文字母 → 显示「墨友」两个字。
 *
 * 背景色通过内联 style 设置，避免被 antd CSS-in-JS 的
 * .ant-avatar 默认底色覆盖（此前评论列表纯色背景失效的原因）。
 */
const UserAvatar = ({ src, account, name, ...rest }: UserAvatarProps) => {
    const source = (account || name || "").trim();
    const firstChar = source.charAt(0);
    const label = /^[a-zA-Z]$/.test(firstChar)
        ? firstChar.toUpperCase()
        : "墨友";
    const color =
        AVATAR_PALETTE[
            hashText(source || "moyou") % AVATAR_PALETTE.length
        ];

    return (
        <Avatar
            src={src || undefined}
            style={{ backgroundColor: color, color: "#fff" }}
            {...rest}
        >
            {!src && label}
        </Avatar>
    );
};

export default UserAvatar;
