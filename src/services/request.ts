import axios from "axios";

import type {AxiosRequestConfig} from "axios";

// 创建axios实例
const axiosInstance = axios.create({

    baseURL:"/api",

    timeout:5000

});

// 请求拦截器
axiosInstance.interceptors.request.use(

    config=>{

        const token = localStorage.getItem("token");

        if(token){
            config.headers.Authorization =
                `Bearer ${token}`;
        }
        return config;
    },
    error=>Promise.reject(error)
);

// 响应拦截器
axiosInstance.interceptors.response.use(
    response=>{
        return response.data;
    },
    error=>{
        return Promise.reject(error);
    }

);

// 二次封装
const request = async <T>(

    url:string,
    config?:AxiosRequestConfig

):Promise<T>=>{

    const res = await axiosInstance({
        url,
        ...config
    });
    return res as T;

};


export default request;