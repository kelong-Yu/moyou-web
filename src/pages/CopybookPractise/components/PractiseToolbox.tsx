import {
    ReadOutlined,
    EditOutlined,
    PartitionOutlined,
    RobotOutlined,
} from "@ant-design/icons";


export interface PractiseToolboxProps {
    /**
     * 点击某个工具时的回调
     *
     * @param toolName 工具名称（释文对照 / 在线练习 / 笔画拆解 / 问问 AI / 手势翻页）
     */
    onToolClick: (toolName: string) => void;

    /**
     * 当前激活（高亮）的工具名称
     *
     * 例如"释文对照"展开、"手势翻页"开启时高亮对应按钮
     */
    activeTool?: string;
}

/** 工具箱工具项配置 */
const TOOLS = [
    { name: "释文对照", icon: <ReadOutlined className="text-xl" /> },
    { name: "在线练习", icon: <EditOutlined className="text-xl" /> },
    { name: "笔画拆解", icon: <PartitionOutlined className="text-xl" /> },
    { name: "问问 AI", icon: <RobotOutlined className="text-xl" /> },

];

/**
 * 临帖工具箱
 *
 * 从 CopybookPractise 页面拆出的独立组件，
 * 展示于右侧栏顶部，样式与拆分前保持一致。
 */
const PractiseToolbox = ({
    onToolClick,
    activeTool,
}: PractiseToolboxProps) => {
    return (
        <div className="w-full rounded-xl border border-[#964328]/15 bg-white/80 shadow-sm p-3">
            <h3 className="text-base font-bold text-[#3F332A] mb-3">
                临帖工具箱
            </h3>

            <div className="grid grid-cols-4 gap-1">
                {TOOLS.map((tool) => {
                    const isActive = activeTool === tool.name;

                    return (
                        <button
                            key={tool.name}
                            type="button"
                            onClick={() => onToolClick(tool.name)}
                            className={`min-w-0 flex flex-col items-center justify-center gap-1 rounded-lg py-2 transition-colors cursor-pointer border-0 bg-transparent ${
                                isActive
                                    ? "text-[#964328] bg-[#964328]/10"
                                    : "text-[#756B61] hover:text-[#964328] hover:bg-[#964328]/5"
                            }`}
                        >
                            {tool.icon}
                            <span className="text-[10px] whitespace-nowrap">
                                {tool.name}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default PractiseToolbox;
