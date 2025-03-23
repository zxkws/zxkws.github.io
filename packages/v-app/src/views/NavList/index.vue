<template>
  <div class="w-full h-full bg-gray-100 overflow-y-auto p-4">
      <div class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
        <a
          v-for="(item, index) in navItems"
          :key="index"
          :href="item.url"
          target="_blank"
          class="p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 flex items-center"
        >
          <span class="text-gray-800 hover:text-blue-600">{{ item.name }}</span>
        </a>
      </div>
  </div>
</template>

<script setup>

const navItems = [
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
    { name: '高德交通指数', url: 'https://report.amap.com/m/dist/#/ct'},
    { name: 'my sub', url: 'https://p.lookli.nyc.mn/proxy/https://gist.githubusercontent.com/zxkws/6bb690997dc4af34b5938ecc91249f91/raw/clash.yaml'},
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
</script>
