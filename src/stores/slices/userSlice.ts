import { createSlice } from "@reduxjs/toolkit";
import type {  PayloadAction } from "@reduxjs/toolkit";

/**
 * 用户状态管理
 * 作用：
 * 1. 保存当前登录用户
 * 2. 全局任何组件都可以获取用户信息
 * 3. 退出登录时清空用户
 */

//定义用户状态结构
interface UserState{
    userInfo: API.CurrentUser | null;
}

//Redux初始化数据
const initialState: UserState = {
    //默认没有用户登录
    userInfo: null
}

/**
 * 创建用户Slice
 *
 * slice包含：
 *
 * state   数据
 *
 * reducers 修改数据的方法
 */
const userSlice = createSlice({
    //模块名称
    name: "user",
    //初始状态
    initialState,
    reducers: {
        //保存用户信息，调用dispatch(setUserInfo(user))
        setUserInfo( state,action:PayloadAction<API.CurrentUser> ){
            state.userInfo = action.payload
        },
        //退出登录清空
        clearUserInfo(state){
            state.userInfo = null;
        }
    }
})

//导出修改方法
export const {
    setUserInfo,
    clearUserInfo
} = userSlice.actions;

//导出reducer给store注册
export default userSlice.reducer;