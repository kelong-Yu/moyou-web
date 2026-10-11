import {
    SoundOutlined,
    CloseOutlined
} from "@ant-design/icons";

import "./index.css";

import dayjs from "dayjs";

import {useState} from "react";


interface Props {
    list:API.Announcement[];
    setList:React.Dispatch<   React.SetStateAction<API.Announcement[]> >

}


const AnnouncementNotice = ({
    list,
    setList
}:Props)=>{


    //正在关闭的公告id
    const [closingIds,setClosingIds] =
        useState<number[]>([]);

    const closeAnnouncement=(id:number)=>{


        // 添加关闭动画状态
        setClosingIds(prev=>[
            ...prev,
            id
        ]);


        // 等动画结束再删除
        setTimeout(()=>{


            setList(prev=>
                prev.filter(
                    item=>item.id!==id
                )
            );


        },300);


    }



    return (

        <div className="announcement-wrapper">
            {
                list.map(item=>(
                    <div
                    key={item.id}
                    className={
                        `
                        announcement-bar
                        ${
                          closingIds.includes(item.id)
                          ?
                          "closing"
                          :
                          ""
                        }
                        `
                    }


                    >


                        <SoundOutlined
                            className="announcement-icon"
                        />



                        <div className="announcement-title">

                            {item.title}

                        </div>



                        <div className="announcement-content">

                            {item.content}

                        </div>



                        <div className="announcement-time">

                            {
                                dayjs(
                                    item.publishTime
                                )
                                .format(
                                    "YYYY-MM-DD"
                                )
                            }

                        </div>



                        <CloseOutlined

                            className="announcement-close"

                            onClick={()=>
                                closeAnnouncement(item.id)
                            }

                        />



                    </div>


                ))
            }


        </div>

    )

}


export default AnnouncementNotice;