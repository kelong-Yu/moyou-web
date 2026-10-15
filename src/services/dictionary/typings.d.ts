declare namespace API {

  /**
   * 书法字典 · 跨碑帖单字列表项
   *
   * GET /api/web/dictionary/characters 返回，
   * imageUrl 为后端生成的 MinIO 临时访问地址（存在有效期）。
   */
  type WebDictionaryCharacter = {

    /** 单字记录ID（copybook_character.id） */
    characterId: number;

    /** 识别出的汉字 */
    characterText?: string;

    /** 单字裁切图片临时访问地址 */
    imageUrl?: string;

    /** 该字在所属碑帖中的页码，可能为空 */
    pageNumber?: number;

    /** 所属碑帖ID */
    copybookId: number;

    /** 所属碑帖名称 */
    copybookName?: string;

    /** 书法风格（楷书 / 行书 / 草书 / 隶书 / 篆书 / 行楷 等），可能为空 */
    style?: string;

    /** 书法家姓名，可能为空（佚名碑帖） */
    calligrapherName?: string;

    /** 朝代名称，可能为空 */
    dynastyName?: string;
  }

  /**
   * 书法字典 · 单字分页查询参数
   */
  type DictionaryCharacterPageParams = {

    /** 查询汉字（必填，单个字符，后端精确匹配） */
    character: string;

    /**
     * 简繁变体候选字串（如 "龙龍"，含输入字本身）
     *
     * 后端拆成字符集合与 character 合并去重后
     * IN 匹配 character_text，兼容字库中简繁两种收录形态。
     */
    variants?: string;

    /** 书法风格关键词，不传 = 全部字体（后端按碑帖 style 模糊匹配） */
    style?: string;

    pageNum?: number;

    pageSize?: number;
  }

  /**
   * 书法字典 · 单字分页响应
   */
  type WebDictionaryCharacterPageResponse = {

    records: WebDictionaryCharacter[];

    total: number;

    current: number;

    size: number;
  }
}
