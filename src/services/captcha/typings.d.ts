declare namespace API {
  /** 滑块拼图验证码下发数据 */
  type SliderCaptcha = {
    /** 本次验证码唯一标识 */
    captchaId: string;
    /** 带缺口的背景图（data:image/png;base64,...） */
    bgImage: string;
    /** 拼图块（透明背景 data:image/png;base64,...） */
    puzzleImage: string;
    /** 拼图块纵向偏移（px） */
    y: number;
    /** 背景图宽度（px） */
    width: number;
    /** 背景图高度（px） */
    height: number;
    /** 拼图块画布边长（px，正方形） */
    puzzleWidth: number;
  };

  /** 滑块校验请求参数 */
  type SliderCaptchaVerifyParams = {
    captchaId: string;
    /** 拼图块最终横向位移（背景图坐标系，px） */
    x: number;
    /** 拖动耗时（ms） */
    duration?: number;
    /** 拖动采样点数量 */
    moves?: number;
  };

  /** 滑块校验结果 */
  type SliderCaptchaVerifyResult = {
    passed: boolean;
    /** 通过后下发的一次性凭证 */
    captchaToken?: string;
    message?: string;
  };
}
