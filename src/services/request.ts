import axios from "axios";

import type {AxiosRequestConfig} from "axios";

// 创建axios实例
// 不设 baseURL：各 service 里写的就是完整路径（/api/web/...），
// 再加一层 /api 会变成 /api/api/...，只能靠 dev 代理 rewrite 兜底。
// 与 moyou-manage 的 config/proxy.ts 保持同一约定：代理不重写路径。
const axiosInstance = axios.create({

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