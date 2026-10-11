declare namespace API {

  //前端通用返回类型，和后端返回Result对应
  type Result<T> = {
    code?: number;
    message?: string;
    data?: T;
  };
  
}