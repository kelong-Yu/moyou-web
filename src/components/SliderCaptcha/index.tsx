import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Modal, Spin } from "antd";
import {
  CheckOutlined,
  SafetyCertificateFilled,
  ReloadOutlined,
  RightOutlined,
  CloseCircleFilled,
  LoadingOutlined,
} from "@ant-design/icons";
import {
  getSliderCaptcha,
  verifySliderCaptcha,
} from "../../services/captcha/api";

/** 滑块把手宽度（px） */
const HANDLE_WIDTH = 44;
/** 轨道高度（px） */
const TRACK_HEIGHT = 44;

/** 供父组件命令式调用 */
export interface SliderCaptchaRef {
  /** 打开验证弹窗（用于「点击发送验证码」等场景） */
  open: () => void;
  /** 重置为未验证状态 */
  reset: () => void;
}

interface SliderCaptchaProps {
  /** 是否已通过验证（受控） */
  verified: boolean;
  /** 验证成功回调，返回一次性 captchaToken */
  onSuccess: (token: string) => void;
  /** 隐藏默认触发框，仅保留弹窗（配合 ref.open() 使用） */
  hideTrigger?: boolean;
  /** 触发框文案 */
  text?: string;
}

type Status = "idle" | "loading" | "fail" | "success";

/**
 * 自研滑块拼图人机验证组件
 *
 * - 默认渲染一个「安全验证」触发框，点击弹出滑块拼图；
 * - 拖动把手使拼图块对齐缺口，松手后向后端校验，通过则下发一次性 token；
 * - hideTrigger + ref.open() 可用于「点击发送验证码时」直接弹窗验证。
 */
const SliderCaptcha = forwardRef<SliderCaptchaRef, SliderCaptchaProps>(
  function SliderCaptcha(
    { verified, onSuccess, hideTrigger, text },
    ref
  ) {
    const [open, setOpen] = useState(false);
    const [captcha, setCaptcha] = useState<API.SliderCaptcha | null>(null);
    const [status, setStatus] = useState<Status>("idle");
    const [failMsg, setFailMsg] = useState("");
    const [handleLeft, setHandleLeft] = useState(0);

    // 逻辑用 ref（避免事件闭包读到过期 state）
    const handleLeftRef = useRef(0);
    const dragging = useRef(false);
    const startX = useRef(0);
    const startHandle = useRef(0);
    const startTime = useRef(0);
    const moves = useRef(0);

    const bgWidth = captcha?.width ?? 320;
    const puzzleWidth = captcha?.puzzleWidth ?? 60;
    const trackMax = Math.max(1, bgWidth - HANDLE_WIDTH);
    const pieceMax = Math.max(0, bgWidth - puzzleWidth);
    const pieceLeft = (handleLeft / trackMax) * pieceMax;

    const resetDrag = useCallback(() => {
      handleLeftRef.current = 0;
      setHandleLeft(0);
    }, []);

    const loadCaptcha = useCallback(async () => {
      setStatus("loading");
      setFailMsg("");
      resetDrag();
      try {
        const res = await getSliderCaptcha();
        if (res.code === 200 && res.data) {
          setCaptcha(res.data);
          setStatus("idle");
        } else {
          setCaptcha(null);
          setStatus("fail");
          setFailMsg("验证码加载失败，请点击刷新");
        }
      } catch {
        setCaptcha(null);
        setStatus("fail");
        setFailMsg("验证码加载失败，请点击刷新");
      }
    }, [resetDrag]);

    const openModal = useCallback(() => {
      setOpen(true);
      // 每次打开都换一道新题，避免复用已失效的验证码
      loadCaptcha();
    }, [loadCaptcha]);

    useImperativeHandle(
      ref,
      () => ({
        open: () => {
          if (verified) return;
          openModal();
        },
        reset: () => {
          setCaptcha(null);
          setStatus("idle");
          setFailMsg("");
          resetDrag();
        },
      }),
      [verified, openModal, resetDrag]
    );

    // 父组件把 verified 置回 false（如登录失败）时，清空内部状态
    useEffect(() => {
      if (!verified) {
        setCaptcha(null);
        setStatus("idle");
        setFailMsg("");
        resetDrag();
      }
    }, [verified, resetDrag]);

    const closeModal = () => {
      if (status === "loading") return;
      setOpen(false);
    };

    // ==================== 拖动 ====================
    const onPointerDown = (e: React.PointerEvent) => {
      if (status === "success" || status === "loading" || !captcha) return;
      dragging.current = true;
      startX.current = e.clientX;
      startHandle.current = handleLeftRef.current;
      startTime.current = Date.now();
      moves.current = 0;
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent) => {
      if (!dragging.current) return;
      moves.current += 1;
      const delta = e.clientX - startX.current;
      let next = startHandle.current + delta;
      next = Math.max(0, Math.min(trackMax, next));
      handleLeftRef.current = next;
      setHandleLeft(next);
    };

    const onPointerUp = async () => {
      if (!dragging.current || !captcha) return;
      dragging.current = false;

      const duration = Date.now() - startTime.current;
      const x = Math.round((handleLeftRef.current / trackMax) * pieceMax);

      setStatus("loading");
      try {
        const res = await verifySliderCaptcha({
          captchaId: captcha.captchaId,
          x,
          duration,
          moves: moves.current,
        });
        if (res.code === 200 && res.data?.passed && res.data.captchaToken) {
          setStatus("success");
          const token = res.data.captchaToken;
          window.setTimeout(() => {
            setOpen(false);
            onSuccess(token);
          }, 450);
        } else {
          setStatus("fail");
          setFailMsg(res.data?.message || "验证失败，请重试");
          window.setTimeout(() => loadCaptcha(), 700);
        }
      } catch {
        setStatus("fail");
        setFailMsg("验证失败，请重试");
        window.setTimeout(() => loadCaptcha(), 700);
      }
    };

    // ==================== 渲染 ====================
    const triggerBox = !hideTrigger ? (
      <div
        style={{
          ...styles.captchaContainer,
        }}
      >
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
            borderColor: verified ? "#8c381e" : "#e2e8f0",
            cursor: verified ? "default" : "pointer",
          }}
          onClick={() => {
            if (!verified) openModal();
          }}
        >
          <div
            style={{
              ...styles.checkbox,
              backgroundColor: verified ? "#8c381e" : "#fff",
              borderColor: verified ? "#8c381e" : "#cbd5e1",
            }}
          >
            {verified && (
              <CheckOutlined style={{ color: "#fff", fontSize: 12 }} />
            )}
          </div>
          <span style={styles.captchaText}>
            {verified ? "已通过安全验证" : text || "点击完成安全验证"}
          </span>
        </div>
      </div>
    ) : null;

    return (
      <>
        {triggerBox}

        <Modal
          open={open}
          onCancel={closeModal}
          footer={null}
          width={bgWidth + 48}
          maskClosable={false}
          destroyOnHidden
          centered
          title={
            <span style={{ fontSize: 15, fontWeight: 600, color: "#334155" }}>
              安全验证
            </span>
          }
        >
          <div style={{ width: bgWidth, margin: "0 auto" }}>
            {/* 拼图区域 */}
            <div
              style={{
                position: "relative",
                width: bgWidth,
                height: captcha?.height ?? 160,
                borderRadius: 8,
                overflow: "hidden",
                background: "#f1f5f9",
                userSelect: "none",
              }}
            >
              {captcha && (
                <>
                  <img
                    src={captcha.bgImage}
                    alt="captcha-bg"
                    draggable={false}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: bgWidth,
                      height: captcha.height,
                    }}
                  />
                  <img
                    src={captcha.puzzleImage}
                    alt="captcha-piece"
                    draggable={false}
                    style={{
                      position: "absolute",
                      top: captcha.y,
                      left: pieceLeft,
                      width: puzzleWidth,
                      height: puzzleWidth,
                      transition: dragging.current
                        ? "none"
                        : "left 0.1s linear",
                      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.35))",
                    }}
                  />
                </>
              )}

              {/* 加载中 */}
              {status === "loading" && (
                <div style={styles.overlay}>
                  <Spin
                    indicator={
                      <LoadingOutlined spin style={{ fontSize: 24, color: "#fff" }} />
                    }
                  />
                </div>
              )}

              {/* 失败提示 */}
              {status === "fail" && (
                <div style={{ ...styles.overlay, background: "rgba(180,30,30,0.55)" }}>
                  <CloseCircleFilled style={{ color: "#fff", fontSize: 22 }} />
                  <span style={{ color: "#fff", marginTop: 8, fontSize: 13 }}>
                    {failMsg}
                  </span>
                </div>
              )}

              {/* 成功提示 */}
              {status === "success" && (
                <div style={{ ...styles.overlay, background: "rgba(22,120,60,0.5)" }}>
                  <CheckOutlined style={{ color: "#fff", fontSize: 26 }} />
                  <span style={{ color: "#fff", marginTop: 8, fontSize: 13 }}>
                    验证通过
                  </span>
                </div>
              )}

              {/* 刷新按钮 */}
              <ReloadOutlined
                onClick={() => {
                  if (status === "loading") return;
                  loadCaptcha();
                }}
                style={styles.refreshBtn}
                title="刷新验证码"
              />
            </div>

            {/* 滑动轨道 */}
            <div
              style={{
                position: "relative",
                width: bgWidth,
                height: TRACK_HEIGHT,
                marginTop: 14,
                borderRadius: 8,
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
                overflow: "hidden",
              }}
            >
              {/* 已滑过区域 */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  width: handleLeft + HANDLE_WIDTH / 2,
                  background:
                    status === "success"
                      ? "rgba(22,163,74,0.25)"
                      : "rgba(140,56,30,0.15)",
                }}
              />

              {/* 提示文案 */}
              {!dragging.current && status !== "success" && (
                <span style={styles.trackHint}>拖动滑块完成拼图</span>
              )}

              {/* 把手 */}
              <div
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                style={{
                  ...styles.handle,
                  left: handleLeft,
                  background:
                    status === "success"
                      ? "#16a34a"
                      : status === "fail"
                      ? "#b41e1e"
                      : "#8c381e",
                  cursor: status === "success" ? "default" : "grab",
                  touchAction: "none",
                }}
              >
                {status === "success" ? (
                  <CheckOutlined style={{ color: "#fff", fontSize: 16 }} />
                ) : (
                  <RightOutlined style={{ color: "#fff", fontSize: 16 }} />
                )}
              </div>
            </div>
          </div>
        </Modal>
      </>
    );
  }
);

const styles: { [key: string]: React.CSSProperties } = {
  captchaContainer: {
    backgroundColor: "#f8fafc",
    border: "1px solid #f1f5f9",
    borderRadius: 12,
    padding: "14px 16px",
    marginBottom: 20,
  },
  captchaHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: 12,
  },
  captchaBox: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "10px 14px",
    transition: "all 0.2s ease",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    border: "2px solid #cbd5e1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    transition: "all 0.2s ease",
    flexShrink: 0,
  },
  captchaText: {
    fontSize: 14,
    fontWeight: 500,
    color: "#1e293b",
    userSelect: "none",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(15,23,42,0.45)",
    zIndex: 3,
  },
  refreshBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    fontSize: 16,
    color: "#fff",
    background: "rgba(0,0,0,0.35)",
    borderRadius: 6,
    padding: 5,
    cursor: "pointer",
    zIndex: 4,
  },
  trackHint: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    color: "#94a3b8",
    pointerEvents: "none",
    userSelect: "none",
  },
  handle: {
    position: "absolute",
    top: 0,
    width: HANDLE_WIDTH,
    height: TRACK_HEIGHT,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    zIndex: 2,
  },
};

export default SliderCaptcha;
