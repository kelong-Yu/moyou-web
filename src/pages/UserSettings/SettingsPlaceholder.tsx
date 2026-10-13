import { Empty } from "antd";

/**
 * 个人中心占位页
 *
 * 我的消息 / 浏览历史 / API 密钥 / 主页设置
 * 暂未实现，仅保留路由与统一占位展示。
 */
const SettingsPlaceholder = ({ title }: { title: string }) => {
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs py-20 text-center">
            <Empty description={`「${title}」功能开发中，敬请期待`} />
        </div>
    );
};

export default SettingsPlaceholder;
