import React, { useState, useEffect, useRef, useMemo } from "react";

interface HeroCalligraphy3DRingProps {
  calligrapherList: API.Calligrapher[];
  onSelectCalligrapher: (id: number) => void;
}

export const HeroCalligraphy3DRing: React.FC<HeroCalligraphy3DRingProps> = ({
  calligrapherList,
  onSelectCalligrapher,
}) => {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const angleRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const [, forceRender] = useState({});

  // 1. 上层：Canvas 粒子星空背景
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 500);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || 500;
    };
    window.addEventListener("resize", handleResize);

    const stars = Array.from({ length: 80 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * (height * 0.6),
      radius: Math.random() * 1.8 + 0.5,
      alpha: Math.random(),
      speed: Math.random() * 0.015 + 0.005,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      stars.forEach((star) => {
        star.alpha += star.speed;
        if (star.alpha > 1 || star.alpha < 0) {
          star.speed = -star.speed;
        }
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(253, 230, 138, ${Math.abs(star.alpha) * 0.8})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#fde047";
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // 2. 顺时针旋转逻辑
  useEffect(() => {
    const updateRotation = () => {
      if (hoveredId === null) {
        angleRef.current = (angleRef.current + 0.18) % 360;
        forceRender({});
      }
      animFrameRef.current = requestAnimationFrame(updateRotation);
    };

    animFrameRef.current = requestAnimationFrame(updateRotation);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [hoveredId]);

  // 3. 数据分配（在此处调整【左右展开半径 rx】）
  const ringItems = useMemo(() => {
    if (!calligrapherList || calligrapherList.length === 0) return [];

    const data = calligrapherList.slice(0, 24);
    const half = Math.ceil(data.length / 2);

    return data.map((item, index) => {
      const isOuter = index < half;
      const ringIndex = isOuter ? index : index - half;
      const ringTotal = isOuter ? half : data.length - half;

      const baseAngle = (ringIndex / ringTotal) * 360;

      // 【调整点1】：增大了 rx 半径，让字往左右两边大范围靠拢扩展
      const rx = isOuter ? 600 : 400; // （原 460 / 310）
      const ry = isOuter ? 210 : 135; // 纵向弧度

      return {
        ...item,
        isOuter,
        baseAngle,
        rx,
        ry,
      };
    });
  }, [calligrapherList]);

  return (
    <div className="relative w-full h-135 overflow-hidden bg-[#0a080d] select-none font-serif shadow-[inset_0_-80px_80px_rgba(10,8,13,0.95)]">
      {/* 1. 【上层】星空背景 */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* 背景暗纹遮罩 */}
      <div className="absolute inset-0 bg-radial from-amber-950/20 via-transparent to-[#0a080d] pointer-events-none" />

      {/* 【调整点2】：底部内阴影/渐隐过度层，防止底部文字切边太生硬 */}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-[#0a080d] via-[#0a080d]/80 to-transparent pointer-events-none z-30" />

      {/* 2. 【中层】页面介绍大标题 */}
      <div className="absolute top-44 left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none w-full max-w-2xl px-4">
        <h1 className="text-6xl md:text-6xl font-bold text-white tracking-widest mb-6 font-serif">
          书法地图
        </h1>
        <p className="text-xl md:text-xl text-gray-400 tracking-widest mb-6 font-serif">
          "以地理为经，以书家为纬，一览千年书法文化版图"
        </p>
      </div>

      {/* 3. 【下层】3D 俯视扁平旋转文字 */}
      {/* 【调整点1.2】：宽度设为 w-[1300px]，-bottom-4 下沉位置 */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-325 h-95 z-10 flex items-center justify-center">
        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{
            perspective: "1000px",
            perspectiveOrigin: "50% 30%",
          }}
        >
          {/* 3D 倾斜平面（俯视扁平视角） */}
          <div
            className="relative w-0 h-0"
            style={{
              transformStyle: "preserve-3d",
              transform: "rotateX(68deg)",
            }}
          >
            {ringItems.map((item) => {
              const currentAngle = (item.baseAngle + angleRef.current) % 360;
              const rad = (currentAngle * Math.PI) / 180;

              // 计算椭圆轨迹坐标
              const x = item.rx * Math.cos(rad);
              const y = item.ry * Math.sin(rad);

              const isHovered = hoveredId === item.id;
              const hasHover = hoveredId !== null;

              const mainCopybook = item.representativeCopybooks?.[0]?.name || "墨宝";

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectCalligrapher(item.id)}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="absolute cursor-pointer group"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: `translate3d(${x}px, ${y}px, 0px) rotateX(-68deg)`,
                    left: 0,
                    top: 0,
                    zIndex: isHovered ? 999 : Math.floor(y + 300),
                  }}
                >
                  {/* 单个竖排书法节点 */}
                  <div
                    className={`
                      flex flex-col items-center px-2 py-3 rounded-md transition-all duration-200
                      ${
                        isHovered
                          ? "scale-125 -translate-y-2 opacity-100 bg-amber-950/80 border border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.6)] backdrop-blur-md"
                          : hasHover
                          ? "opacity-20"
                          : "opacity-80 group-hover:opacity-100"
                      }
                    `}
                  >
                    {/* 竖排文本：姓名 — 代表作 */}
                    <div
                      className={`
                        font-serif text-sm md:text-base font-medium tracking-widest leading-loose flex items-center gap-1.5
                        ${
                          isHovered
                            ? "text-amber-200 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                            : "text-amber-100/80 group-hover:text-amber-200"
                        }
                      `}
                      style={{
                        writingMode: "vertical-rl",
                        textOrientation: "upright",
                      }}
                    >
                      <span className="font-bold">{item.name}</span>
                      <span className="text-amber-500/60 text-xs font-sans my-1">
                        —
                      </span>
                      <span className="text-xs text-amber-300/90">
                        {mainCopybook}
                      </span>
                    </div>

                    {/* 底部点缀 */}
                    <div
                      className={`w-1.5 h-1.5 rounded-full mt-2 transition-all ${
                        isHovered
                          ? "bg-amber-400 shadow-[0_0_10px_#f59e0b] scale-125"
                          : "bg-amber-600/40"
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroCalligraphy3DRing;