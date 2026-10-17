import { useRef, useState } from "react";
import { App, Input, Modal } from "antd";
import { PenLine, Plus, X } from "lucide-react";
import { submitFeedback } from "../../services/feedback/api";

const { TextArea } = Input;

/** 最多几张截图，超出后忽略并提示 */
const MAX_SHOTS = 5;

/** 单张截图体积上限 */
const MAX_SHOT_BYTES = 5 * 1024 * 1024;

/** 正文长度上限 */
const MAX_CONTENT = 2000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Shot = {
    id: string;
    name: string;
    /**
     * 本地预览地址。只存在于这一次会话，
     * 移除或关闭时必须 revoke，否则 Blob 会一直被持有在内存里。
     */
    url: string;
};

interface FeedbackModalProps {
    open: boolean;
    onClose: () => void;
}

/**
 * 反馈弹窗
 *
 * 从顶部导航「更多」菜单进入。正文必填、邮箱选填、截图可选，
 * 截图支持点击选择与直接粘贴。
 */
const FeedbackModal = ({ open, onClose }: FeedbackModalProps) => {
    const { message } = App.useApp();

    const [content, setContent] = useState("");
    const [email, setEmail] = useState("");
    const [shots, setShots] = useState<Shot[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const trimmedContent = content.trim();
    const trimmedEmail = email.trim();
    const emailValid = !trimmedEmail || EMAIL_PATTERN.test(trimmedEmail);
    const canSubmit = !!trimmedContent && emailValid && !submitting;

    const releaseShots = (list: Shot[]) =>
        list.forEach((shot) => URL.revokeObjectURL(shot.url));

    /** 关闭即清空，下次打开是全新表单 */
    const handleClose = () => {
        releaseShots(shots);
        setShots([]);
        setContent("");
        setEmail("");
        onClose();
    };

    const addFiles = (files: File[]) => {
        const images = files.filter((file) => file.type.startsWith("image/"));

        if (!images.length) {
            message.warning("只能添加图片文件");
            return;
        }

        const room = MAX_SHOTS - shots.length;
        if (room <= 0) {
            message.warning(`最多添加 ${MAX_SHOTS} 张截图`);
            return;
        }

        const accepted: Shot[] = [];
        let oversizeCount = 0;

        images.slice(0, room).forEach((file) => {
            if (file.size > MAX_SHOT_BYTES) {
                oversizeCount += 1;
                return;
            }
            accepted.push({
                id: `${Date.now()}-${accepted.length}-${file.name}`,
                name: file.name,
                url: URL.createObjectURL(file),
            });
        });

        if (oversizeCount) {
            message.warning(`${oversizeCount} 张超过 5MB，已跳过`);
        }
        if (images.length > room) {
            message.warning(`最多 ${MAX_SHOTS} 张，超出部分未添加`);
        }
        if (accepted.length) {
            setShots((prev) => [...prev, ...accepted]);
        }
    };

    const removeShot = (id: string) => {
        setShots((prev) => {
            const target = prev.find((shot) => shot.id === id);
            if (target) URL.revokeObjectURL(target.url);
            return prev.filter((shot) => shot.id !== id);
        });
    };

    /** 截图直接粘贴进弹窗，不必先存盘再点上传框 */
    const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
        const files = Array.from(event.clipboardData.files);
        if (files.length) {
            event.preventDefault();
            addFiles(files);
        }
    };

    const handleSubmit = async () => {
        if (!trimmedContent) {
            message.warning("请先填写问题或建议");
            return;
        }
        if (!emailValid) {
            message.warning("邮箱格式不正确");
            return;
        }

        setSubmitting(true);
        try {
            const res = await submitFeedback({
                content: trimmedContent,
                contactEmail: trimmedEmail || undefined,
            });

            // 业务失败也是 HTTP 200，必须看 code
            if (res.code === 200) {
                message.success("反馈已收到，谢谢你！");
                handleClose();
            } else {
                message.error(res.message || "提交失败，请稍后再试");
            }
        } catch {
            message.error("提交失败，请检查网络或稍后再试");
        } finally {
            setSubmitting(false);
        }
    };

    const labelClass = "block mb-2 text-[13px] font-medium text-[#5C5148]";

    return (
        <Modal
            open={open}
            onCancel={handleClose}
            footer={null}
            centered
            width={560}
            styles={{
                container: {
                    background: "#FFFCF2",
                    borderRadius: 16,
                    padding: "26px 28px 20px",
                },
                body: { padding: 0 },
            }}
        >
            <div className="font-serif" onPaste={handlePaste}>
                {/* ---------- 标题 ---------- */}
                <h3 className="m-0 text-[17px] font-bold leading-6 text-[#2F2A26]">
                    有什么想反馈的
                </h3>
                <p className="mt-1 mb-0 text-[13px] leading-5 text-[#8D8378]">
                    告诉我们你遇到的问题或建议，这些信息将用于改进墨友。
                </p>

                {/* ---------- 问题或建议 ---------- */}
                <div className="mt-5">
                    <span className={labelClass}>问题或建议（必填）</span>
                    <TextArea
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        placeholder="描述你看到了什么、期望发生什么，以及可以稳定复现的操作步骤"
                        maxLength={MAX_CONTENT}
                        autoSize={{ minRows: 5, maxRows: 10 }}
                    />
                </div>

                {/* ---------- 屏幕截图 ---------- */}
                <div className="mt-5">
                    <span className={labelClass}>屏幕截图</span>

                    <div className="flex flex-wrap gap-3">
                        {shots.map((shot) => (
                            <div
                                key={shot.id}
                                className="relative w-[148px] h-[148px] rounded-[10px] overflow-hidden border border-[#E8E2D8] bg-white"
                            >
                                <img
                                    src={shot.url}
                                    alt={shot.name}
                                    className="w-full h-full object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeShot(shot.id)}
                                    aria-label="移除这张截图"
                                    className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded-full border-none bg-black/55 text-white cursor-pointer hover:bg-black/70 transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}

                        {shots.length < MAX_SHOTS && (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-[148px] h-[148px] flex flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[#D8D0C2] bg-transparent text-[#8D8378] cursor-pointer hover:border-[#964328] hover:text-[#964328] transition-colors"
                            >
                                <Plus size={18} />
                                <span className="px-3 text-center text-[12px] leading-4">
                                    添加或粘贴截图
                                </span>
                            </button>
                        )}
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(event) => {
                            addFiles(Array.from(event.target.files ?? []));
                            // 允许连续选同一张图，必须清掉 value
                            event.target.value = "";
                        }}
                    />
                </div>

                {/* ---------- 联系邮箱 ---------- */}
                <div className="mt-5">
                    <span className={labelClass}>联系邮箱（可选）</span>
                    <Input
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="便于我们联系你进一步了解问题"
                        maxLength={100}
                        status={trimmedEmail && !emailValid ? "error" : undefined}
                    />
                    {trimmedEmail && !emailValid && (
                        <p className="mt-1 mb-0 text-[12px] text-[#D4380D]">
                            邮箱格式不正确
                        </p>
                    )}
                </div>

                {/* ---------- 底部操作 ---------- */}
                <div className="mt-6 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 rounded-[10px] border-none bg-transparent text-[14px] text-[#5C5148] cursor-pointer hover:bg-black/5 transition-colors"
                    >
                        取消
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] border-none text-[14px] font-medium cursor-pointer transition-colors disabled:cursor-not-allowed"
                        style={
                            canSubmit
                                ? { background: "#964328", color: "#FFFFFF" }
                                : { background: "#E3DDD2", color: "#A9A29A" }
                        }
                    >
                        <PenLine size={14} />
                        发送反馈
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default FeedbackModal;
