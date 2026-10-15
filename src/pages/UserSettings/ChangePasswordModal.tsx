import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal, Form, Input, Alert, App } from "antd";
import { useDispatch } from "react-redux";
import { clearUserInfo } from "../../stores/slices/userSlice";
import { changePassword } from "../../services/user/api";

interface ChangePasswordModalProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
}

/**
 * 修改密码弹窗（个人设置 · 安全设置）
 *
 * 在当前页以 Modal 形式完成，不跳转新页面；
 * 需校验原密码，成功后关闭并清空表单。
 */
const ChangePasswordModal = ({ open, onClose }: ChangePasswordModalProps) => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleOk = async () => {
    let values: API.ChangePasswordParams;
    try {
      values = await form.validateFields();
    } catch {
      // 校验失败，Ant Design 会自动提示
      return;
    }

    try {
      setSubmitting(true);
      const res: any = await changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
        checkPassword: values.checkPassword,
      });

      if (res.code === 200) {
        message.success("密码修改成功，请使用新密码重新登录");
        form.resetFields();
        onClose();
        // 密码已变更：清除本地登录态并引导重新登录
        localStorage.removeItem("token");
        dispatch(clearUserInfo());
        navigate("/login", { replace: true });
        return;
      }

      if (res.code === 4001) {
        message.info("登录已过期，请重新登录");
        onClose();
        return;
      }

      message.error(res.message || "密码修改失败");
    } catch {
      message.error("密码修改失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="修改密码"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="确认修改"
      cancelText="取消"
      confirmLoading={submitting}
      maskClosable={false}
      destroyOnHidden
      okButtonProps={{ className: "!bg-[#964328]" }}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        style={{ marginTop: 12 }}
      >
        <Form.Item
          label="原密码"
          name="oldPassword"
          rules={[{ required: true, message: "请输入原密码" }]}
        >
          <Input.Password
            placeholder="请输入当前密码"
            size="large"
            autoComplete="current-password"
          />
        </Form.Item>

        <Form.Item
          label="新密码"
          name="newPassword"
          rules={[
            { required: true, message: "请输入新密码" },
            { min: 8, message: "密码不能小于8位" },
          ]}
        >
          <Input.Password
            placeholder="请输入新密码（至少8位）"
            size="large"
            autoComplete="new-password"
          />
        </Form.Item>

        <Form.Item
          label="确认新密码"
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
        >
          <Input.Password
            placeholder="请再次输入新密码"
            size="large"
            autoComplete="new-password"
          />
        </Form.Item>
      </Form>

      {/* 密码要求提示 */}
      <Alert
        type="info"
        showIcon
        title="密码要求："
        description={
          <ul style={{ margin: 0, paddingLeft: 0 }}>
            <li>至少 8 个字符</li>
            <li>不能与当前密码相同</li>
            <li>建议包含字母、数字和特殊字符</li>
          </ul>
        }
      />
    </Modal>
  );
};

export default ChangePasswordModal;
