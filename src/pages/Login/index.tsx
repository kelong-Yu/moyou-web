import React, { useEffect, useState } from "react";
import { Form, Input, Button, App } from "antd";
import {
  UserOutlined,
  LockOutlined,
  ArrowLeftOutlined,
  LoginOutlined,
  SafetyCertificateFilled,
  CheckOutlined,
} from "@ant-design/icons";
import { login, currentUser } from "../../services/user/api";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setUserInfo } from "../../stores/slices/userSlice";
import type { RootState } from "../../stores";
import logo from "../../assets/moyoulogo.png";
import bg from "../../assets/lantingxu.jpg";
import { usePageMeta } from "../../hooks/usePageMeta";

const Login = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();

  // 页面标题（登录页不记录浏览历史）
  usePageMeta({ title: "登录", record: false });
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();

  // 当前登录会话（Redux，由 AuthProvider 启动时恢复）
  const userInfo = useSelector((state: RootState) => state.user.userInfo);

  /**
   * 登录成功 / 已登录用户访问登录页时的去向：
   * 优先回跳 ?redirect= 携带的原页面
   * （仅允许站内相对路径，防开放重定向），否则回首页
   */
  const goToTarget = () => {
    const redirect = searchParams.get("redirect") || "/";
    const safe =
      redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
    navigate(safe, { replace: true });
  };

  // 已登录用户不应停留在登录页：
  // Redux 已有用户立即跳走（含会话稍后才恢复完成的情况）
  useEffect(() => {
    if (userInfo) {
      goToTarget();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo]);

  // 本地有 token 但 Redux 未恢复（刷新 / 新标签直接输入 /login）：
  // 向服务端确认会话，有效则直接跳走，无效正常展示登录表单
  useEffect(() => {
    if (userInfo || !localStorage.getItem("token")) return;

    let cancelled = false;

    (async () => {
      try {
        const res = (await currentUser()) as API.Result<API.CurrentUser>;
        if (cancelled) return;

        if (res.code === 200 && res.data) {
          dispatch(setUserInfo(res.data));
          goToTarget();
        }
      } catch {
        // 校验失败按未登录处理，正常展示登录表单
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 真人验证状态
  const [isVerified, setIsVerified] = useState(false);

  const handleLogin = async (values: API.LoginParams) => {
    // 验证真人状态校验
    if (!isVerified) {
      message.warning("请先完成真人安全验证");
      return;
    }

    try {
      const res = (await login(values)) as API.Result<string>;
      if (res.code === 200) {
        //1、保存JWT
        localStorage.setItem("token", res.data);
        //2、获取当前用户
        const userRes = (await currentUser()) as API.Result<API.CurrentUser>;
        if (userRes.code === 200) {
          //3、保存redux
          dispatch(setUserInfo(userRes.data));
        }
        message.success("登录成功");
        // 有 redirect 参数（如被登录守卫拦下的单字临帖页）则回原页面
        goToTarget();
        return;
      }
      message.error(res.message || "登录失败");
    } catch {
      message.error("登录失败");
    }
  };

  return (
    <div style={styles.pageWrapper}>
      {/* 4. 覆盖 Ant Design Label 默认宽度限制，强制两端对齐 */}
      <style>{`
        .ant-form-item-label {
          width: 100% !important;
        }
        .ant-form-item-label > label {
          width: 100% !important;
          display: flex !important;
          justify-content: space-between !important;
        }
      `}</style>

      {/* 背景图片 + 遮罩层 */}
      <div
        style={{
          ...styles.bgImage,
          backgroundImage: `url(${bg})`,
        }}
      />
      <div style={styles.bgOverlay} />

      {/* 登录悬浮卡片 */}
      <div style={styles.loginCard}>
        {/* Logo 与 头部标题 */}
        <div style={styles.header}>
          <img src={logo} alt="logo" style={styles.logo} />
          <p style={styles.subtitle}>登录您的账户</p>
        </div>

        {/* 登录表单 */}
        <Form onFinish={handleLogin} layout="vertical" requiredMark={false}>
          {/* 用户名/邮箱 */}
          <Form.Item
            label={<span style={styles.fieldLabel}>用户名或邮箱</span>}
            name="userAccount"
            rules={[
              {
                required: true,
                message: "请输入账号或邮箱",
              },
              {
                min: 4,
                message: "账号或邮箱长度不能小于4",
              },
            ]}
            style={{ marginBottom: 18 }}
          >
            <Input
              prefix={<UserOutlined style={{ color: "#a0aec0" }} />}
              placeholder="请输入用户名或邮箱"
              size="large"
              style={styles.inputStyle}
            />
          </Form.Item>

          {/* 密码框 + 忘记密码 */}
          <Form.Item
            label={
              <div style={styles.passwordLabelRow}>
                <span style={styles.fieldLabel}>密码</span>
                <Link to="/forgot-password" style={styles.forgotLink}>
                  忘记密码？
                </Link>
              </div>
            }
            name="userPassword"
            rules={[
              {
                required: true,
                message: "请输入密码",
              },
              {
                min: 8,
                message: "密码不能小于8位",
              },
            ]}
            style={{ marginBottom: 16 }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#a0aec0" }} />}
              placeholder="请输入密码"
              size="large"
              style={styles.inputStyle}
            />
          </Form.Item>

          {/* 真人验证框 */}
          <div style={styles.captchaContainer}>
            <div style={styles.captchaHeader}>
              <SafetyCertificateFilled
                style={{ color: "#8c381e", fontSize: 18, marginRight: 8 }}
              />
              <span style={{ fontWeight: 600, color: "#334155", fontSize: 14 }}>
                安全验证
              </span>
            </div>

            <div
              style={{
                ...styles.captchaBox,
                borderColor: isVerified ? "#8c381e" : "#e2e8f0",
              }}
              onClick={() => setIsVerified(!isVerified)}
            >
              <div
                style={{
                  ...styles.checkbox,
                  backgroundColor: isVerified ? "#8c381e" : "#fff",
                  borderColor: isVerified ? "#8c381e" : "#cbd5e1",
                }}
              >
                {isVerified && (
                  <CheckOutlined style={{ color: "#fff", fontSize: 12 }} />
                )}
              </div>
              <span style={styles.captchaText}>Verify you're human</span>
            </div>

            <div style={{ marginTop: 10, textAlign: "left" }}>
              <a
                href="#captcha-help"
                onClick={(e) => e.preventDefault()}
                style={styles.captchaHelpLink}
              >
                无法完成智能验证？使用图片验证码登录
              </a>
            </div>
          </div>

          {/* 登录按钮 */}
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            style={styles.loginBtn}
          >
            <LoginOutlined style={{ marginRight: 6 }} />
            登录
          </Button>

          {/* 返回按钮 */}
          <Button
            block
            size="large"
            onClick={() => navigate('/')}
            style={styles.backBtn}
          >
            <ArrowLeftOutlined style={{ marginRight: 6 }} />
            返回
          </Button>

          {/* 底部注册链接 */}
          <div style={styles.footerText}>
            还没有账户？{" "}
            <Link to="/register" style={styles.registerLink}>
              注册
            </Link>
          </div>
        </Form>
      </div>
    </div>
  );
};

// 样式配置表
const styles: { [key: string]: React.CSSProperties } = {
  pageWrapper: {
    position: "relative",
    width: "100vw",
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  bgImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: "saturate(99%) contrast(99%)",
    zIndex: 1,
  },
  bgOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(245, 247, 250, 0.45)",
    backdropFilter: "blur(4px)",
    zIndex: 2,
  },
  // 1. 悬浮白色卡片：加宽并提升立体悬浮阴影
  loginCard: {
    position: "relative",
    zIndex: 3,
    width: "100%",
    maxWidth: "480px", // 框框变宽
    padding: "40px 38px",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    boxShadow:
      "0 20px 50px rgba(0, 0, 0, 0.22), 0 10px 20px rgba(0, 0, 0, 0.12)", // 深层次立体阴影
    border: "1px solid rgba(255, 255, 255, 0.8)",
  },
  // 2. 头部 Log 与文字居中调整
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    marginBottom: "28px",
  },
  logo: {
    height: "52px",
    objectFit: "contain",
    marginBottom: "12px",
    display: "block",
  },
  subtitle: {
    margin: "0",
    fontSize: "16px", // p标签文字加大
    fontWeight: 500,
    color: "#475569",
    textAlign: "center",
  },
  fieldLabel: {
    fontSize: "14px",
    fontWeight: 500,
    color: "#334155",
  },
  passwordLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  forgotLink: {
    fontSize: "13px",
    color: "#64748b",
    textDecoration: "none",
  },
  inputStyle: {
    borderRadius: "8px",
    height: "44px",
    borderColor: "#e2e8f0",
  },
  // 真人验证组件样式
  captchaContainer: {
    backgroundColor: "#f8fafc",
    border: "1px solid #f1f5f9",
    borderRadius: "12px",
    padding: "14px 16px",
    marginBottom: "20px",
  },
  captchaHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: "12px",
  },
  captchaBox: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "10px 14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  checkbox: {
    width: "20px",
    height: "20px",
    borderRadius: "4px",
    border: "2px solid #cbd5e1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: "12px",
    transition: "all 0.2s ease",
  },
  captchaText: {
    fontSize: "14px",
    fontWeight: 500,
    color: "#1e293b",
    userSelect: "none",
  },
  captchaHelpLink: {
    fontSize: "12px",
    color: "#8c381e", // 3. 颜色调整为与登录按钮一致的棕红色
    textDecoration: "none",
  },
  loginBtn: {
    backgroundColor: "#8c381e",
    borderColor: "#8c381e",
    borderRadius: "8px",
    height: "44px",
    fontSize: "15px",
    fontWeight: 600,
    marginBottom: "12px",
    boxShadow: "0 4px 12px rgba(140, 56, 30, 0.25)",
  },
  backBtn: {
    backgroundColor: "#eaeeef",
    borderColor: "transparent",
    color: "#475569",
    borderRadius: "8px",
    height: "44px",
    fontSize: "15px",
    fontWeight: 500,
    marginBottom: "20px",
  },
  footerText: {
    textAlign: "center",
    fontSize: "14px",
    color: "#64748b",
  },
  registerLink: {
    color: "#8c381e",
    fontWeight: 600,
    textDecoration: "underline",
    marginLeft: "4px",
  },
};

export default Login;