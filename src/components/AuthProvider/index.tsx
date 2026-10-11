
import {  useEffect } from "react";
import { useDispatch } from "react-redux";
import { currentUser } from "../../services/user/api";
import { setUserInfo } from "../../stores/slices/userSlice";

interface Props{
    children: React.ReactNode;
}

/**
 * 用户权限初始化组件，项目启动时执行
 * 读取token，调用currentUser，保存Redux
 */

const AuthProvider = ({children}: Props) => {
    const dispatch = useDispatch();

    useEffect(() => {
        const initUser = async() => {
            //读取JWT
            const token = localStorage.getItem("token");
            //没有token说明没有登录
            if(!token){
                return;
            }
            try {
                //根据token获取当前用户
                const res:any = await currentUser();
                if(res.code === 200){
                    //保存Redux
                    dispatch(setUserInfo(res.data))
                }
            }catch(error){
                console.log("获取当前用户失败",error)
                //token失效
                localStorage.removeItem("token");
            }
        }
        initUser();
    },[])
    return children;
}
export default AuthProvider;