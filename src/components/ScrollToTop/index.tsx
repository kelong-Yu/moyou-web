import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // 监听路由路径改变，强制重置滚动位置到顶部
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;