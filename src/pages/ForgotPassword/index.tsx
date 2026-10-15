import React, { useEffect, useRef, useState } from "react";
import { Form, Input, Button, App } from "antd";
import {
  LockOutlined,
  MailOutlined,
  KeyOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { resetPassword, sendEmailCode } from "../../services/user/api";
import SliderCaptcha, {
  type SliderCaptchaRef,
} from "../../components/SliderCaptcha";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../assets/moyoulogo.png";
import bg from "../../assets/lantingxu.jpg";
import { usePageMeta } from "../../hooks/usePageMeta";

/**
 * 忘记密码（重置密码）
 *
 * 流程：输入邮箱 → 点击"发送验证码"触发滑块人机验证 → 校验通过后发送
 * reset 场景邮箱验证码 → 填写新密码 → 提交重置 → 跳转登录页。
 */
const ForgotPassword = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();

  usePageMeta({ title: "忘记密码", record: false });
  const [form] = Form.useForm();

  // 验证码倒计时
  const [countdown, setCountdown] = useState(0);
  // 是否正在发送验证码
  const [sendingCode, setSendingCode] = useState(false);
  // 是否正在提交
  const [submitting, setSubmitting] = useState(false);

  // 滑块人机验证：点击"发送验证码"时命令式打开
  const captchaRef = useRef<SliderCaptchaRef>(null);
  const pendingSendRef = useRef(false);
  const pendingEmailRef = useRef("");

  /** 验证码倒计时 */
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  /**
   * 点击"发送验证码"：先校验邮箱，再弹出滑块验证
   */
  const handleSendCode = async () => {
    let values: { email: string };
    try {
      values = await form.validateFields(["email"]);
    } catch {
      return;
    }
    pendingEmailRef.current = values.email.trim();
    pendingSendRef.current = true;
    captchaRef.current?.open();
  };

  /**
   * 真正发送验证码（携带一次性 captchaToken，scene=reset）
   */
  const doSendCode = async (email: string, captchaToken: string) => {
    try {
      setSendingCode(true);
      const res: any = await sendEmailCode(email, "reset", captchaToken);
      if (res.code === 200) {
        message.success("验证码已发送，请查收邮箱");
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

  /** 滑块验证成功回调 */
  const handleCaptchaSuccess = (token: string) => {
    if (pendingSendRef.current) {
      pendingSendRef.current = false;
      doSendCode(pendingEmailRef.current, token);
    }
  };

  /** 提交重置密码 */
  const handleSubmit = async (values: API.ResetPasswordParams) => {
    try {
      setSubmitting(true);
      const res: any = await resetPassword({
        email: values.email?.trim(),
        code: values.code?.trim(),
        newPassword: values.newPassword,
        checkPassword: values.checkPassword,
      });

      if (res.code === 200) {
        message.success("密码重置成功，请使用新密码登录");
        navigate("/login");
        return;
      }
      message.error(res.message || "密码重置失败");
    } catch {
      message.error("密码重置失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.pageWrapper}>
      <style>{`
        .ant-form-item-label {
          width: 100% !important;
        }
        .ant-form-item-label > label {
          width: 100% !important;
          display: flex !important;
          justify-content: space-between !important;
        }
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
      <div style={{ ...styles.bgImage, backgroundImage: `url(${bg})` }} />
      <div style={styles.bgOverlay} />

      {/* 悬浮卡片 */}
      <div style={styles.card}>
        <div style={styles.header}>
          <img src={logo} alt="logo" style={styles.logo} />
          <p style={styles.subtitle}>找回您的账户密码</p>
        </div>

        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          requiredMark={false}
        >
          {/* 邮箱 */}
          <Form.Item
            label={<span style={styles.fieldLabel}>邮箱</span>}
            name="email"
            rules={[
              { required: true, message: "请输入邮箱" },
              { type: "email", message: "请输入正确的邮箱格式" },
            ]}
            style={{ marginBottom: 16 }}
          >
            <Input
              prefix={<MailOutlined style={{ color: "#a0aec0" }} />}
              placeholder="请输入注册时使用的邮箱"
              size="large"
              style={styles.inputStyle}
            />
          </Form.Item>

          {/* 邮箱验证码 */}
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
              { required: true, message: "请输入邮箱验证码" },
              { pattern: /^\d{6}$/, message: "验证码必须为6位数字" },
            ]}
            style={{ marginBottom: 16 }}
          >
            <Input.OTP length={6} size="large" />
          </Form.Item>

          {/* 新密码 */}
          <Form.Item
            label={<span style={styles.fieldLabel}>新密码</span>}
            name="newPassword"
            rules={[
              { required: true, message: "请输入新密码" },
              { min: 8, message: "密码不能小于8位" },
            ]}
            style={{ marginBottom: 16 }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#a0aec0" }} />}
              placeholder="请输入新密码（至少8位）"
              size="large"
              style={styles.inputStyle}
            />
          </Form.Item>

          {/* 确认新密码 */}
          <Form.Item
            label={<span style={styles.fieldLabel}>确认新密码</span>}
            name="checkPassword"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "请再次输入新密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的密码不一致"));
                },
              }),
            ]}
            style={{ marginBottom: 24 }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#a0aec0" }} />}
              placeholder="请再次输入新密码"
              size="large"
              style={styles.inputStyle}
            />
          </Form.Item>

          {/* 提交按钮 */}
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={submitting}
            style={styles.submitBtn}
          >
            <KeyOutlined style={{ marginRight: 6 }} />
            重置密码
          </Button>

          {/* 返回登录 */}
          <Button
            block
            size="large"
            onClick={() => navigate("/login")}
            style={styles.backBtn}
          >
            <ArrowLeftOutlined style={{ marginRight: 6 }} />
            返回登录
          </Button>

          <div style={styles.footerText}>
            想起来了？{" "}
            <Link to="/login" style={styles.link}>
              直接登录
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
  card: {
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
  submitBtn: {
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
  link: {
    color: "#8c381e",
    fontWeight: 600,
    textDecoration: "underline",
    marginLeft: "4px",
  },
};

export default ForgotPassword;
