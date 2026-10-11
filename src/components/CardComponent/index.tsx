import React from "react";
interface CardStatistic {
    icon: React.ReactNode;
    value?: number | string;

}

interface CardComponentProps {
    /**
     * 图片地址
     */
    image: string;
    /**
     * 图片高度
     * 例如：
     * 碑帖 260px
     * 头像 120px
     */
    imageHeight?: string;
    /**
     * 图片展示模式
     */
    imageFit?: "cover" | "contain";
    /**
     * 标题
     */
    title: string;
    /**
     * 副标题
     */
    subtitle?: string;
    /**
     * 描述
     */
    description?: string;


    /**
     * 标签
     */
    tags?: string[];


    /**
     * 底部统计
     */
    statistics?: CardStatistic[];

    //点击事件
    onClick?: () => void;


}


const CardComponent: React.FC<CardComponentProps> = ({

    image,

    imageHeight = "260px",

    imageFit = "cover",

    title,

    subtitle,

    description,

    tags,

    statistics,
    onClick

}) => {


    return (

        <div
            className="
            bg-white
            rounded-xl
            overflow-hidden
            shadow-sm
            hover:shadow-xl
            transition-all
            duration-300
            cursor-pointer
            "
            onClick={onClick}
        >


            {/* 图片区域 */}
            <div
                style={{
                    height: imageHeight
                }}
            >

                <img

                    src={image}

                    alt={title}

                    className="
                        w-full
                        h-full
                        object-cover
                    "
                />

            </div>

            <div className="p-4">
                {/* 标题 */}

                <h3
                    className="
                    text-lg
                    font-bold
                    text-gray-800
                    "
                >
                    {title}
                </h3>

                {/* 副标题 */}

                {
                    subtitle &&

                    <div
                        className="
                        text-sm
                        text-gray-500
                        mt-1
                        "
                    >
                        {subtitle}
                    </div>

                }

                {/* 标签 */}

                {
                    tags && tags.length > 0 &&

                    <div
                        className="
                        flex
                        gap-2
                        mt-3
                        "
                    >

                        {
                            tags.map(tag => (

                                <span
                                    key={tag}
                                    className="
                                    px-2
                                    py-1
                                    text-xs
                                    bg-gray-100
                                    rounded
                                    text-gray-600
                                    "
                                >
                                    {tag}
                                </span>

                            ))
                        }

                    </div>

                }




                {/* 描述 */}

                {
                    description &&

                    <p
                        className="
                        text-sm
                        text-gray-600
                        mt-3
                        line-clamp-2
                        "
                    >
                        {description}
                    </p>

                }




                {/* 数据 */}

                {
                    statistics &&

                    <div
                        className="
                        flex
                        gap-4
                        mt-4
                        text-xs
                        text-gray-400
                        "
                    >

                        {
                            statistics.map((item, index) => (

                                <div
                                    key={index}
                                    className="
                                    flex
                                    items-center
                                    gap-1
                                    "
                                >

                                    {item.icon}

                                    <span>
                                        {item.value}
                                    </span>

                                </div>

                            ))
                        }


                    </div>

                }


            </div>


        </div>

    )


}


export default CardComponent;