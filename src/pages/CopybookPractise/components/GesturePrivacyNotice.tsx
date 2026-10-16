import { Modal } from "antd";
import { ShieldCheck } from "lucide-react";

interface GesturePrivacyNoticeProps {
    /** 是否打开 */
    open: boolean;
    /** 取消（不进入手势翻页） */
    onCancel: () => void;
    /** 确认并开启 */
    onConfirm: () => void;
}

/** 隐私说明条目 */
const PRIVACY_POINTS = [
    "摄像头画面只在你当前这个浏览器标签页里实时分析，用完即弃。",
    "不会录制、不会保存，也不会上传到墨友的服务器或任何第三方！",
    "只识别手腕在画面里的上下移动趋势，用来判断「上一页 / 下一页」。",
    "点击右上角关闭、关闭大图或离开本页，摄像头会立即停止工作。",
];

/**
 * 手势翻页隐私提示弹窗
 *
 * 点击「隔空翻页」进入时先弹出，说明画面全部在本地处理、
 * 不会上传服务器，用户确认后才申请摄像头权限。
 */
const GesturePrivacyNotice = ({
    open,
    onCancel,
    onConfirm,
}: GesturePrivacyNoticeProps) => (
    <Modal
        open={open}
        onCancel={onCancel}
        onOk={onConfirm}
        okText="我知道了，开启手势翻页"
        cancelText="暂不使用"
        okButtonProps={{ style: { background: "#964328" } }}
        /* 必须高于全屏大图查看器（z-[9999]）：
           书法字典的手势入口就在查看器内部，
           提示框若用默认 z-index 会被遮罩整个压住、点了像没反应。 */
        zIndex={10001}
        centered
        width={460}
        title={
            <span className="flex items-center gap-2 font-serif text-[#3F332A]">
                <ShieldCheck size={18} className="text-[#964328]" />
                关于手势翻页
            </span>
        }
    >
        <div className="font-serif text-[13px] leading-6 text-[#5C5148]">
            <p>
                这个功能会启用摄像头，请须知：
            </p>

            <ul className="mt-3 space-y-2">
                {PRIVACY_POINTS.map((point) => (
                    <li key={point} className="flex gap-2">
                        <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[#964328]/60" />
                        <span>{point}</span>
                    </li>
                ))}
            </ul>

            <p className="mt-3 text-[12px] text-[#8D8378]">
                整个过程不需要联网传输影像，浏览器地址栏也会随时显示摄像头正在被使用的提示。
            </p>
        </div>
    </Modal>
);

export default GesturePrivacyNotice;
