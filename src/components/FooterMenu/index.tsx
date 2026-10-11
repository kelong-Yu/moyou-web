import React from "react";
import { Link } from "react-router-dom";
import { MailOutlined } from "@ant-design/icons";
import moyouLogo from "../../assets/moyoulogo.png";

const FooterMenu: React.FC = () => {
  return (
    <footer className="w-full min-h-100 bg-[#0F172A] text-gray-400 font-sans border-t border-gray-800/50 flex flex-col justify-between">
      {/* 上半部分：多列内容区 */}
      <div className="max-w-7xl w-full mx-auto mt-16 px-8 pt-10 pb-6 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* 第一列：Logo 与 机构信息 */}
        <div className="flex flex-col items-start gap-3">
          <img
            src={moyouLogo}
            alt="墨友 Logo"
            className="h-10 w-auto object-contain brightness-0 invert opacity-90"
          />
          <div className="text-xs text-gray-400 leading-relaxed space-y-1.5 mt-2 ">
            <p>【主办单位】 墨友书法文化数字传播中心</p>
            <p>【技术支持】 全球汉字与书法影像研发团队</p>
          </div>
        </div>

        {/* 第二列：项目团队 */}
        <div className="flex flex-col gap-2">
          <h4 className="text-white text-lg font-bold tracking-wider mb-2 font-serif">
            图书馆推荐
          </h4>
          <div className="text-xs text-gray-400 space-y-2">
              <p className="text-gray-400 font-medium">中华古籍智慧化服务平台</p>
              <p className=" font-medium">中国国家图书馆</p>
              <p className=" font-medium">日本内阁文库</p>
              <p className=" font-medium">哈佛大学图书馆</p>
              <p className=" font-medium">宫内厅书陵部</p>
              <p className=" font-medium">京都大学图书馆</p>
              <p className=" font-medium">世界数字图书馆</p>
              <p className=" font-medium">不列颠哥伦比亚大学图书馆</p>
          </div>
        </div>

        {/* 第三列：快速链接 */}
        <div className="flex flex-col gap-2">
          <h4 className="text-white text-lg font-bold tracking-wider mb-2 font-serif">
            快速链接
          </h4>
          <ul className="text-sm space-y-2.5 p-0 m-0 list-none">
            <li>
              <Link to="/" className="text-gray-400 hover:text-white transition-colors">
                首页
              </Link>
            </li>
            <li>
              <Link to="/copybook" className="text-gray-400 hover:text-white transition-colors">
                碑帖字库
              </Link>
            </li>
            <li>
              <Link to="/map" className="text-gray-400 hover:text-white transition-colors">
                书法地图
              </Link>
            </li>
          </ul>
        </div>

        {/* 第四列：联系我们 */}
        <div className="flex flex-col gap-2">
          <h4 className="text-white text-lg font-bold tracking-wider mb-2 font-serif">
            联系我们
          </h4>
          <div className="text-sm text-gray-400 flex items-start gap-2">
            <MailOutlined className="mt-0.5 text-gray-400" />
            <div>
              <p className="text-gray-400">意见反馈</p>
              <a
                href="mailto:contact@moyou.com"
                className="text-gray-400 hover:text-white transition-colors"
              >
                contact@moyou.com
              </a>
            </div>
          </div>
        </div>

      </div>

      {/* 下半部分：分隔线与 版权信息 */}
      <div className="border-t border-gray-800/80 py-6 text-center text-xs text-gray-500 tracking-wider">
        © 2026 墨友 - 全球书法影像开放集成系统
      </div>
    </footer>
  );
};

export default FooterMenu;