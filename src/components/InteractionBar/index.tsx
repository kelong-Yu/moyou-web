import {
    LikeOutlined,
    MessageOutlined,
    StarOutlined,
    WarningOutlined
} from "@ant-design/icons";


interface InteractionBarProps {


    // 点赞数量
    likeCount:number;


    // 评论数量
    commentCount:number;


    // 收藏数量
    favoriteCount:number;


    // 是否点赞
    liked:boolean;


    // 是否收藏
    favorited:boolean;

    /** 互动信息尚在加载时避免展示误导性的 0 */
    loading?: boolean;

    /** 请求进行中禁止重复提交 */
    disabled?: boolean;



    // 点击点赞
    onLike:()=>void;



    // 点击收藏
    onFavorite:()=>void;



    // 点击评论
    onComment?:()=>void;


}



const InteractionBar:React.FC<InteractionBarProps> = (props)=>{


    const {
        likeCount,
        commentCount,
        favoriteCount,
        liked,
        favorited,
        loading = false,
        disabled = false,
        onLike,
        onFavorite,
        onComment

    } = props;



    return (

        <div
            className="
            fixed
            left-24
            top-1/3
            z-50
            flex
            flex-col
            gap-5
            "
        >


            {/* 点赞 */}

            <button

                onClick={onLike}
                disabled={disabled}
                aria-label={liked ? "取消点赞" : "点赞"}
                title={liked ? "取消点赞" : "点赞"}

                className="
                w-12 h-12
                rounded-full
                bg-white
                shadow-md
                flex
                items-center
                justify-center
                text-lg
                hover:scale-110
                transition
                cursor-pointer
                disabled:cursor-not-allowed
                disabled:opacity-60
                "

            >

                <LikeOutlined
                    style={{
                        color: liked 
                        ? "#ef4444"
                        : undefined
                    }}
                />

                {loading ? "—" : likeCount}

            </button>



            {/* 评论 */}

            <button

                onClick={onComment}

                className="
                w-12 h-12
                rounded-full
                bg-white
                shadow-md
                flex
                items-center
                justify-center
                text-lg
                hover:scale-110
                transition
                cursor-pointer
                "

            >

                <MessageOutlined/>

                {loading ? "—" : commentCount}

            </button>



            {/* 收藏 */}

            <button

                onClick={onFavorite}
                disabled={disabled}
                aria-label={favorited ? "取消收藏" : "收藏"}
                title={favorited ? "取消收藏" : "收藏"}

                className="
                w-12 h-12
                rounded-full
                bg-white
                shadow-md
                flex
                items-center
                justify-center
                text-lg
                hover:scale-110
                transition
                cursor-pointer
                disabled:cursor-not-allowed
                disabled:opacity-60
                "

            >

                <StarOutlined

                    style={{
                        color:favorited
                        ? "#eab308"
                        : undefined
                    }}

                />

                {loading ? "—" : favoriteCount}

            </button>



            {/* 举报 */}

            <button

                className="
                w-12 h-12
                rounded-full
                bg-white
                shadow-md
                flex
                items-center
                justify-center
                text-lg
                hover:scale-110
                transition
                cursor-pointer
                "

            >

                <WarningOutlined/>

            </button>


        </div>

    );

};


export default InteractionBar;
