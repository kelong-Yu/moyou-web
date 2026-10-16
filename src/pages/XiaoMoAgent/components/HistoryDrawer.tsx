import { useState } from "react";
import {
    App,
    Button,
    Drawer,
    Dropdown,
    Empty,
    Input,
    Modal,
    Spin,
} from "antd";
import {
    CloseOutlined,
    DeleteOutlined,
    EditOutlined,
    FileAddOutlined,
    PushpinFilled,
    PushpinOutlined,
    SearchOutlined,
    MoreOutlined,
} from "@ant-design/icons";

interface HistoryDrawerProps {
    open: boolean;
    onClose: () => void;
    items: API.AiConversationResponse[];
    loading: boolean;
    /** 当前会话 ID */
    activeId: number | null;
    /** 标题搜索关键词 */
    keyword: string;
    onKeywordChange: (keyword: string) => void;
    onSelect: (conversationId: number) => void;
    onNewTask: () => void;
    onRename: (conversationId: number, title: string) => Promise<void>;
    onToggleTop: (item: API.AiConversationResponse) => void;
    onDelete: (item: API.AiConversationResponse) => void;
    /** AI 回复中：禁止切换会话与新建任务 */
    busy: boolean;
}

/** 更新时间展示：2026-09-28T19:44:59 -> 2026-09-28 19:44 */
function formatTime(time: string) {
    return time ? time.replace("T", " ").slice(0, 16) : "";
}

const HistoryDrawer = ({
    open,
    onClose,
    items,
    loading,
    activeId,
    keyword,
    onKeywordChange,
    onSelect,
    onNewTask,
    onRename,
    onToggleTop,
    onDelete,
    busy,
}: HistoryDrawerProps) => {

    const { modal } = App.useApp();

    /** 正在重命名的会话 */
    const [renaming, setRenaming] = useState<API.AiConversationResponse | null>(null);

    const [renameValue, setRenameValue] = useState("");

    const [renameSubmitting, setRenameSubmitting] = useState(false);

    /** 展开更多操作菜单的会话 ID（用于同步触发按钮的高亮态） */
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

    const openRename = (item: API.AiConversationResponse) => {
        setRenaming(item);
        setRenameValue(item.title);
    };

    const handleRenameOk = async () => {
        if (!renaming) {
            return;
        }

        const title = renameValue.trim();

        if (!title) {
            return;
        }

        setRenameSubmitting(true);

        try {
            await onRename(renaming.id, title);
            setRenaming(null);
        } catch {
            // 失败提示由上层统一处理，这里保持弹窗可继续编辑
        } finally {
            setRenameSubmitting(false);
        }
    };

    const confirmDelete = (item: API.AiConversationResponse) => {
        modal.confirm({
            title: "删除该任务？",
            content: "删除后对话及内容将无法恢复，确认删除吗？",
            okText: "删除",
            okButtonProps: { danger: true },
            cancelText: "取消",
            onOk: () => onDelete(item),
        });
    };

    return (
        <Drawer
            className="agent-drawer"
            open={open}
            onClose={onClose}
            placement="left"
            size={360}
            mask={false}
            closable={false}
        >
            <div className="hist-head">
                <span className="hist-head-title">历史列表</span>
                <button
                    type="button"
                    className="hist-close"
                    onClick={onClose}
                    aria-label="关闭历史列表"
                >
                    <CloseOutlined />
                </button>
            </div>

            <div className="hist-body">
                <Input
                    className="hist-search"
                    variant="borderless"
                    allowClear
                    prefix={<SearchOutlined style={{ color: "#a79c90" }} />}
                    placeholder="请输入搜索内容"
                    value={keyword}
                    onChange={event => onKeywordChange(event.target.value)}
                />

                <Button
                    className="hist-new"
                    block
                    icon={<FileAddOutlined />}
                    disabled={busy}
                    onClick={onNewTask}
                >
                    新建任务
                </Button>

                <div className="hist-list">
                    {loading ? (
                        <div className="agent-loading">
                            <Spin />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="hist-empty">
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={
                                    keyword ? "没有匹配的对话" : "暂无对话"
                                }
                            />
                        </div>
                    ) : (
                        items.map(item => (
                            <div
                                key={item.id}
                                className={`hist-item${
                                    item.id === activeId
                                        ? " hist-item--active"
                                        : ""
                                }`}
                                onClick={() => {
                                    if (!busy) {
                                        onSelect(item.id);
                                    }
                                }}
                            >
                                <div className="hist-item-main">
                                    <div className="hist-item-title">
                                        <span className="hist-item-text">
                                            {item.title}
                                        </span>
                                        {item.isTop === 1 && (
                                            <PushpinFilled className="hist-item-pin" />
                                        )}
                                    </div>
                                    <div className="hist-item-time">
                                        {formatTime(item.updateTime)}
                                    </div>
                                </div>

                                <Dropdown
                                    trigger={["click"]}
                                    open={openMenuId === item.id}
                                    onOpenChange={visible =>
                                        setOpenMenuId(
                                            visible ? item.id : null
                                        )
                                    }
                                    menu={{
                                        items: [
                                            {
                                                key: "rename",
                                                icon: <EditOutlined />,
                                                label: "重命名",
                                            },
                                            {
                                                key: "top",
                                                icon: item.isTop === 1
                                                    ? <PushpinFilled />
                                                    : <PushpinOutlined />,
                                                label: item.isTop === 1
                                                    ? "取消置顶"
                                                    : "置顶",
                                            },
                                            {
                                                key: "delete",
                                                icon: <DeleteOutlined />,
                                                label: "删除",
                                                danger: true,
                                            },
                                        ],
                                        onClick: ({ key }) => {
                                            if (key === "rename") {
                                                openRename(item);
                                            } else if (key === "top") {
                                                onToggleTop(item);
                                            } else if (key === "delete") {
                                                confirmDelete(item);
                                            }
                                        },
                                    }}
                                >
                                    <button
                                        type="button"
                                        className={`hist-item-more${
                                            openMenuId === item.id
                                                ? " hist-item-more--open"
                                                : ""
                                        }`}
                                        onClick={event => event.stopPropagation()}
                                        aria-label="更多操作"
                                    >
                                        <MoreOutlined />
                                    </button>
                                </Dropdown>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <Modal
                title="重命名任务"
                open={renaming !== null}
                confirmLoading={renameSubmitting}
                okText="保存"
                cancelText="取消"
                okButtonProps={{ disabled: !renameValue.trim() }}
                onOk={handleRenameOk}
                onCancel={() => setRenaming(null)}
                destroyOnHidden
            >
                <Input
                    value={renameValue}
                    maxLength={50}
                    showCount
                    placeholder="请输入任务名称"
                    onChange={event => setRenameValue(event.target.value)}
                    onPressEnter={handleRenameOk}
                />
            </Modal>
        </Drawer>
    );
};

export default HistoryDrawer;
