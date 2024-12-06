import { useState } from 'react';

const Sidebar = ({ navItems }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredNavItems = navItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white h-screen p-4">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search..."
            className="w-full p-2 text-gray-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <ul className="space-y-2">
          {filteredNavItems.map(item => (
            <li key={item.name}>
              <a
                target='_blank'
                href={item.url}
                className="block py-2 px-4 rounded hover:bg-gray-700"
              >
                {item.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
      {/* Content area */}
      <div className="flex-1 p-10">
        <h1 className="text-3xl font-bold">Content Area</h1>
        <p>Here is the main content of the website.</p>
      </div>
    </div>
  );
};


const navItems = [
    { name: 'chrome代理1', url: 'https://github.jbcj.top/https/www.google.com' },
    { name: 'chrome代理2', url: '#about' },
    { name: 'fofa siteproxy代理', url: 'https://en.fofa.info/result?qbase64=dGl0bGU9InNpdGVwcm94eeS7o%2BeQhiI%3D' },
    { name: 'fofa siteproxy', url: 'https://en.fofa.info/result?qbase64=dGl0bGU9InNpdGVwcm94eSI%3D' },
    { name: '360 siteproxy', url: 'https://quake.360.net/quake/#/index'},
    { name: 'cf优选ip', url: 'https://stock.hostmonit.com/CloudFlareYes'},
    { name: 'cf扫描ip', url: 'https://vfarid.github.io/cf-ip-scanner/'},
    { name: 'Cloudflare CDN节点服务器地址段 ', url: 'https://www.cloudflare-cn.com/ips/'},
    { name: 'better-cf-ip', url: 'https://github.com/badafans/better-cloudflare-ip'},
    { name: '博客', url: 'https://jdssl.top/'},
    { name: 'cf反代', url: 'https://www.smallstep.one/article/cf-cdn-ip-youxuan'},
    { name: '电子书', url: 'https://annas-archive.li/'},
    { name: 'http代理', url: 'http://testt.leov.asia/linuxdo/ip.php'},
    { name: '高德交通指数', url: 'https://report.amap.com/m/dist/#/ct'},
    { name: '埋堆堆TVB', url: '#'},
    { name: 'my sub', url: 'https://proxy.look.cloudns.biz/proxy/https://gist.githubusercontent.com/zxkws/6bb690997dc4af34b5938ecc91249f91/raw/clash.yaml'},
    { name: 'sub 转换', url: 'https://my.subcloud.xyz/'},
    { name: '影视网址导航', url: 'https://axutongxue.com/'},
    { name: '浏览器去广告', url: 'https://mp.weixin.qq.com/s/USvQbx7AwyEVkMDTPnzbQA'},
    { name: '影视app分享', url: 'http://m.wmsio.cn/nd.jsp?mid=325&id=30&groupId=0'},
    { name: '影视在线', url: 'https://yinghe.tv/'},
    { name: '6v在线影视', url: 'https://www.6v520.com/'},
    { name: '在线影视', url: 'https://darkvod.com/'},
    { name: '在线影视', url: 'https://v.warhut.cn/'},
    { name: '在线影视', url: 'http://www.549.tv/'},
    { name: '会员代理', url: 'https://gdfy.ygdns.cn/index'},
    { name: '精美UI', url: 'https://pixso.cn/community/home'},
    { name: '精美UI', url: 'https://www.bossdesign.cn/'},
    { name: '精美UI', url: 'https://github.com/magicuidesign/magicui'},
    { name: '精美UI', url: 'https://blog.sina.com.cn/s/blog_66a46e6c0101a9hu.html'},
    { name: '精美UI', url: 'https://www.xuansite.com/'},
    { name: '精美UI', url: 'https://www.phlox.pro/'},
    { name: 'css sudy', url: 'https://coding2go.com/'},
    { name: 'tailwind-generator', url: 'https://tailwind-generator.com/'},
    { name: 'for-dev-free', url: 'https://free-for.dev/#/?id=major-cloud-providers'},
    { name: 'tailwind-proxy', url: 'https://tailwindui.starxg.com/components'},
    { name: '抄一下', url: 'https://xingpingcn.top/'},
    { name: '模型排行榜', url: 'https://linux.do/t/topic/160263'},
    { name: '', url: ''},
  ];

export default () => {
    return (
        <Sidebar navItems={navItems} />
    )
};
