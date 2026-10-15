import React, { useEffect, useRef, useState } from "react";
import { Form, Input, Button, App } from "antd";
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { register, sendEmailCode } from "../../services/user/api";
import SliderCaptcha, {
  type SliderCaptchaRef,
} from "../../components/SliderCaptcha";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../assets/moyoulogo.png";
import bg from "../../assets/lantingxu.jpg";
import { usePageMeta } from "../../hooks/usePageMeta";

const Register = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();

  // 页面标题（注册页不记录浏览历史）
  usePageMeta({ title: "注册", record: false });
  const [form] = Form.useForm();

  // 验证码倒计时
  const [countdown, setCountdown] = useState(0);

  // 是否正在发送验证码
  const [sendingCode, setSendingCode] = useState(false);

  // 滑块人机验证：点击"发送验证码"时命令式打开
  const captchaRef = useRef<SliderCaptchaRef>(null);
  // 记录一次"待发送"流程，验证通过后立即发送
  const pendingSendRef = useRef(false);
  const pendingEmailRef = useRef("");

  /**
   * 验证码倒计时
   */
  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [countdown]);

  /**
   * 点击"发送验证码"：
   * 先校验邮箱，再弹出滑块人机验证；验证通过后（onSuccess）才真正发信。
   */
  const handleSendCode = async () => {
    // 先校验邮箱
    let values: { email: string };

    try {
      values = await form.validateFields(["email"]);
    } catch {
      // 邮箱校验失败，Ant Design 会自动显示错误
      return;
    }

    // 记录待发送邮箱，打开滑块验证
    pendingEmailRef.current = values.email.trim();
    pendingSendRef.current = true;
    captchaRef.current?.open();
  };

  /**
   * 真正发送验证码（携带一次性 captchaToken，scene=register）
   */
  const doSendCode = async (email: string, captchaToken: string) => {
    try {
      setSendingCode(true);
      const res: any = await sendEmailCode(email, "register", captchaToken);

      if (res.code === 200) {
        message.success("验证码已发送，请查收邮箱");
        // 60秒倒计时
        setCountdown(60);
        return;
      }

      message.error(res.message || "验证码发送失败");
    } catch {
      message.error("验证码发送失败");
    } finally {
      setSendingCode(false);
    }
  };

  /**
   * 滑块验证成功回调：若处于"待发送验证码"流程则立即发送
   */
  const handleCaptchaSuccess = (token: string) => {
    if (pendingSendRef.current) {
      pendingSendRef.current = false;
      doSendCode(pendingEmailRef.current, token);
    }
  };

  /**
   * 注册
   */
  const handleRegister = async (values: API.RegisterParams) => {
    try {
      const res: any = await register({
        email: values.email?.trim(),
        code: values.code?.trim(),
        userAccount: values.userAccount?.trim(),
        userPassword: values.userPassword,
        checkPassword: values.checkPassword,
      });

      if (res.code === 200) {
        message.success("注册成功，请登录");
        navigate("/login");
        return;
      }

      message.error(res.message || "注册失败");
    } catch (e) {
      message.error("注册失败");
    }
  };

  return (
    <div style={styles.pageWrapper}>
      {/* 针对 6位分体验证码框（正方形+紧凑居中）与 Form Label 的 CSS 覆写 */}
      <style>{`
        .ant-form-item-label {
          width: 100% !important;
        }
        .ant-form-item-label > label {
          width: 100% !important;
          display: flex !important;
          justify-content: space-between !important;
        }
        /* 6 位独立正方形验证码框样式（匹配图二） */
        .ant-otp {
          display: flex !important;
          justify-content: center !important;
          gap: 12px !important;
          width: 100% !important;
        }
        .ant-otp .ant-otp-input {
          width: 44px !important;
          height: 44px !important;
          flex: 0 0 44px !important;
          border-radius: 8px !important;
          border: 1px solid #cbd5e1 !important;
          text-align: center !important;
          font-size: 18px !important;
          font-weight: 600 !important;
          color: #1e293b !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
          transition: all 0.2s ease !important;
          padding: 0 !important;
        }
        .ant-otp .ant-otp-input:focus,
        .ant-otp .ant-otp-input-focused {
          border-color: #8c381e !important;
          box-shadow: 0 0 0 2px rgba(140, 56, 30, 0.2) !important;
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

      {/* 注册悬浮卡片 */}
      <div style={styles.registerCard}>
        {/* Logo 与 头部标题 */}
        <div style={styles.header}>
          <img src={logo} alt="logo" style={styles.logo} />
          <p style={styles.subtitle}>创建您的新账户</p>
        </div>

        {/* 注册表单 */}
        <Form
          form={form}
          onFinish={handleRegister}
          layout="vertical"
          requiredMark={false}
        >
          {/* 邮箱 */}
          <Form.Item
            label={<span style={styles.fieldLabel}>邮箱</span>}
            name="email"
            rules={[
              {
                required: true,
                message: "请输入邮箱",
              },
              {
                type: "email",
                message: "请输入正确的邮箱格式",
              },
            ]}
            style={{ marginBottom: 16 }}
          >
            <Input
              prefix={<MailOutlined style={{ color: "#a0aec0" }} />}
              placeholder="请输入邮箱"
              size="large"
              style={styles.inputStyle}
            />
          </Form.Item>

          {/* 邮箱验证码（正方形独立框） */}
          <Form.Item
            label={
              <div style={styles.codeLabelRow}>
                <span style={styles.fieldLabel}>邮箱验证码</span>
                <Button
                  type="link"
                  onClick={handleSendCode}
                  loading={sendingCode}
                  disabled={countdown > 0}
                  style={styles.sendCodeBtn}
                >
                  {countdown > 0 ? `${countdown}s 后重试` : "发送验证码"}
                </Button>
              </div>
            }
            name="code"
            rules={[
              {
                required: true,
                message: "请输入邮箱验证码",
              },
              {
                len: 6,
                message: "验证码为6位数字",
              },
              {
                pattern: /^\d{6}$/,
                message: "验证码必须为6位数字",
              },
            ]}
            style={{ marginBottom: 16 }}
          >
            <Input.OTP length={6} size="large" />
          </Form.Item>

          {/* 账号 */}
          <Form.Item
            label={<span style={styles.fieldLabel}>账号</span>}
            name="userAccount"
            rules={[
              {
                required: true,
                message: "请输入账号",
              },
              {
                min: 4,
                message: "账号长度不能小于4",
              },
              {
                pattern: /^[a-zA-Z0-9_]+$/,
                message: "账号只能包含字母、数字和下划线",
              },
            ]}
            style={{ marginBottom: 16 }}
          >
            <Input
              prefix={<UserOutlined style={{ color: "#a0aec0" }} />}
              placeholder="请输入账号（推荐英文字母开头）"
              size="large"
              style={styles.inputStyle}
            />
          </Form.Item>

          {/* 密码 */}
          <Form.Item
            label={<span style={styles.fieldLabel}>密码</span>}
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

          {/* 确认密码 */}
          <Form.Item
            label={<span style={styles.fieldLabel}>确认密码</span>}
            name="checkPassword"
            dependencies={["userPassword"]}
            rules={[
              {
                required: true,
                message: "请确认密码",
              },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("userPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("两次输入的密码不一致")
                  );
                },
              }),
            ]}
            style={{ marginBottom: 24 }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#a0aec0" }} />}
              placeholder="请再次输入密码"
              size="large"
              style={styles.inputStyle}
            />
          </Form.Item>

          {/* 注册按钮 */}
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            style={styles.loginBtn}
          >
            <UserAddOutlined style={{ marginRight: 6 }} />
            注册
          </Button>

          {/* 底部登录提示 */}
          <div style={styles.footerText}>
            已有账号？{" "}
            <Link to="/login" style={styles.registerLink}>
              登录
            </Link>
          </div>
        </Form>

        {/* 滑块人机验证：无触发框，由"发送验证码"按钮命令式打开 */}
        <SliderCaptcha
          ref={captchaRef}
          hideTrigger
          verified={false}
          onSuccess={handleCaptchaSuccess}
        />
      </div>
    </div>
  );
};

// 样式配置表
const styles: { [key: string]: React.CSSProperties } = {
  pageWrapper: {
    position: "relative",
    width: "100vw",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px 0",
    overflowX: "hidden",
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
  registerCard: {
    position: "relative",
    zIndex: 3,
    width: "100%",
    maxWidth: "480px",
    padding: "36px 38px",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    boxShadow:
      "0 20px 50px rgba(0, 0, 0, 0.22), 0 10px 20px rgba(0, 0, 0, 0.12)",
    border: "1px solid rgba(255, 255, 255, 0.8)",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    marginBottom: "20px",
  },
  logo: {
    height: "52px",
    objectFit: "contain",
    marginBottom: "10px",
    display: "block",
  },
  subtitle: {
    margin: "0",
    fontSize: "16px",
    fontWeight: 500,
    color: "#475569",
    textAlign: "center",
  },
  fieldLabel: {
    fontSize: "14px",
    fontWeight: 500,
    color: "#334155",
  },
  codeLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  sendCodeBtn: {
    padding: 0,
    height: "auto",
    fontSize: "13px",
    color: "#8c381e",
    fontWeight: 500,
  },
  inputStyle: {
    borderRadius: "8px",
    height: "44px",
    borderColor: "#e2e8f0",
  },
  loginBtn: {
    backgroundColor: "#8c381e",
    borderColor: "#8c381e",
    borderRadius: "8px",
    height: "44px",
    fontSize: "15px",
    fontWeight: 600,
    marginBottom: "16px",
    boxShadow: "0 4px 12px rgba(140, 56, 30, 0.25)",
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

export default Register;