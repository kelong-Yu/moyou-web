declare namespace API {
  type Calligrapher = {
    id: number;
    name?: string;
    title?:string;
    dynastyId?: number;
    birthYear?: number;
    deathYear?: number;
    birthplace?: string;
    livingAddress?: string;
    longitude?: number;
    latitude?: number;
    avatar?: string;
    introduction?: string;
    artisticLife?: string;
    achievement?: string;
    styleFeature?: string;
    influence?: string;
    goodAtStyle?: string;
    tags?: string;
    /**
     * 代表作品
     */
    representativeCopybooks?:CopybookSimple[];
    createTime?: string;
    updateTime?: string;
  };

    type CalligrapherLocation = {
        id: number;
        name?: string;
        avatar?: string;
        livingAddress?: string;
        longitude?: number;
        latitude?: number;
    };

     /**
   * 书法家详情
   */
  type CalligrapherDetail = {


    /**
     * id
     */
    id: number;


    /**
     * 人物称号
     */
    title?: string;


    /**
     * 姓名
     */
    name?: string;


    /**
     * 朝代id
     */
    dynastyId?: number;


    /**
     * 出生年份
     */
    birthYear?: number;


    /**
     * 去世年份
     */
    deathYear?: number;


    /**
     * 出生地
     */
    birthplace?: string;


    /**
     * 头像
     */
    avatar?: string;


    /**
     * 个人介绍
     */
    introduction?: string;



    /**
     * 风格特点
     */
    styleFeature?: string;



    /**
     * 艺术人生
     */
    artisticLife?: string;



    /**
     * 主要成就
     */
    achievement?: string;



    /**
     * 擅长风格
     */
    goodAtStyle?: string;



    /**
     * 人物标签
     */
    tags?: string;



    /**
     * 代表作品
     */
    representativeCopybooks?: CopybookSimple[];

  };

  /**
   * 代表碑帖简单信息
   */
  type CopybookSimple = {


    /**
     * 碑帖id
     */
    id:number;



    /**
     * 碑帖名称
     */
    name:string;



    /**
     * 图片
     */
    imageUrl?:string;



    /**
     * 简介
     */
    shortDescription?:string;


  };

  //书法家全部作品
  type CalligrapherWorksResponse = {
    id: number;
    name?: string;
    title?:string;
    avatar?: string;
    dynastyName?: string;
    birthYear?: number;
    deathYear?: number;
    birthplace?: string;
    artisticLife?: string;
    goodAtStyle?: string;
    copybooks ?: WebCopybookResponse[]
  };

  /**
   * 书法家关注状态（含真实粉丝数统计）
   */
  type CalligrapherFollowStatus = {
    /** 当前登录用户是否已关注该书法家（未登录恒为 false） */
    followed?: boolean;
    /** 书法家粉丝数（真实数据库统计） */
    followerCount?: number;
  };

}