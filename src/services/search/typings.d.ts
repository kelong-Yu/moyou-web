declare namespace API {
    /**
 * 搜索类型
 */
 type SearchType =
  | "ALL"
  | "COPYBOOK"
  | "CALLIGRAPHER";


/**
 * 匹配方式
 */
 type MatchType =
  | "EXACT"
  | "FUZZY";

/**
 * 搜索请求参数
 */
 type SearchQueryRequest = {


  /**
   * 搜索关键词
   */
  keyword?: string;


  /**
   * 搜索类型
   * ALL
   * COPYBOOK
   * CALLIGRAPHER
   */
  searchType?: SearchType;



  /**
   * 匹配方式
   * EXACT
   * FUZZY
   */
  matchType?: MatchType;



  /**
   * 朝代id
   */
  dynastyId?: number;



  /**
   * 风格
   */
  style?: string;



  /**
   * 当前页
   */
  current?: number;



  /**
   * 每页数量
   */
  pageSize?: number;

}

/**
 * 碑帖搜索结果
 */
 type SearchCopybookResponse = {


  id:number;


  /**
   * 碑帖名称
   */
  name:string;



  /**
   * 图片
   */
  imageUrl:string;



  /**
   * 作者
   */
  calligrapherName:string;



  /**
   * 朝代
   */
  dynastyName:string;



  /**
   * 风格
   */
  style:string;



  /**
   * 浏览量
   */
  viewCount:number;

}


/**
 * 书法家搜索结果
 */
 type SearchCalligrapherResponse = {


  id:number;



  /**
   * 姓名
   */
  name:string;



  /**
   * 朝代
   */
  dynastyName:string;



  /**
   * 头像
   */
  avatar:string;



  /**
   * 人物介绍
   */
  artisticLife:string;

}


/**
 * 综合搜索返回
 */
 type SearchTotalResponse = {


  /**
   * 碑帖结果
   */
  copybooks?:PageResult<SearchCopybookResponse>;



  /**
   * 书法家结果
   */
  calligraphers?:PageResult<SearchCalligrapherResponse>;

}
}