<template>
  <div class="w-full h-full bg-gray-100 dark:bg-gray-900 overflow-y-auto p-4">
    <div class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
      <a
        v-for="(item, index) in navItems"
        :key="index"
        :href="item.url"
        target="_blank"
        class="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 flex items-center"
      >
        <span class="text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400">{{
          item.name
        }}</span>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

type NavItem = {
  id: number;
  name: string;
  url: string;
};

const staticNavItems: NavItem[] = [
  { name: 'todo', url: '/todo' },
  { name: 'apikey_manage', url: '/api_key_manager/' },
  { name: 'file_manage', url: '/file-management-system/' },
  { name: 'fofa siteproxy代理', url: 'https://en.fofa.info/result?qbase64=dGl0bGU9InNpdGVwcm94eeS7o%2BeQhiI%3D' },
  { name: 'fofa siteproxy', url: 'https://en.fofa.info/result?qbase64=dGl0bGU9InNpdGVwcm94eSI%3D' },
  { name: '360 siteproxy', url: 'https://quake.360.net/quake/#/index' },
  { name: 'cf优选ip', url: 'https://stock.hostmonit.com/CloudFlareYes' },
  { name: 'cf扫描ip', url: 'https://vfarid.github.io/cf-ip-scanner/' },
  { name: 'Cloudflare CDN节点服务器地址段 ', url: 'https://www.cloudflare-cn.com/ips/' },
  { name: '博客', url: 'https://jdssl.top/' },
  {
    name: 'my sub',
    url: 'https://p.lookli.nyc.mn/proxy/https://gist.githubusercontent.com/zxkws/6bb690997dc4af34b5938ecc91249f91/raw/clash.yaml',
  },
  { name: 'sub 转换', url: 'https://my.subcloud.xyz/' },
  { name: '影视网址导航', url: 'https://axutongxue.com/' },
  { name: '影视app分享', url: 'http://m.wmsio.cn/nd.jsp?mid=325&id=30&groupId=0' },
  { name: '影视在线', url: 'https://yinghe.tv/' },
  { name: '6v在线影视', url: 'https://www.6v520.com/' },
  { name: '在线影视', url: 'https://darkvod.com/' },
  { name: '在线影视', url: 'https://v.warhut.cn/' },
  { name: '在线影视', url: 'http://www.549.tv/' },
  { name: '会员代理', url: 'https://gdfy.ygdns.cn/index' },
  { name: '精美UI', url: 'https://pixso.cn/community/home' },
  { name: '精美UI', url: 'https://www.bossdesign.cn/' },
  { name: '精美UI', url: 'https://github.com/magicuidesign/magicui' },
  { name: '精美UI', url: 'https://blog.sina.com.cn/s/blog_66a46e6c0101a9hu.html' },
  { name: '精美UI', url: 'https://www.xuansite.com/' },
  { name: '精美UI', url: 'https://www.phlox.pro/' },
  { name: 'css sudy', url: 'https://coding2go.com/' },
  { name: 'tailwind-generator', url: 'https://tailwind-generator.com/' },
  { name: 'for-dev-free', url: 'https://free-for.dev/#/?id=major-cloud-providers' },
  { name: 'tailwind-proxy', url: 'https://tailwindui.starxg.com/components' },
  { name: '抄一下', url: 'https://xingpingcn.top/' },
  { name: '模型排行榜', url: 'https://linux.do/t/topic/160263' },
  { name: 'bestofjs', url: 'https://bestofjs.org/' },
  { name: 'risingstars', url: 'https://risingstars.js.org/2024/en' },
  { name: '薅羊毛', url: 'https://new.xianbao.fun/' },
  { name: '薅羊毛', url: 'http://www.0818tuan.com/' },
  { name: 'algo', url: 'https://codetop.cc/home' },
  { name: 'algo', url: 'https://github.com/labuladong/fucking-algorithm' },
  { name: 'algo', url: 'https://www.luogu.com.cn/' },
  { name: 'algo', url: 'https://github.com/krahets/hello-algo' },
  { name: 'ssh-tool', url: 'https://ssh.lookli.nyc.mn/' },
  { name: 'mineru', url: 'https://mineru.net/OpenSourceTools/Extractor' },
  { name: 'quark', url: 'https://www.quark.so/' },
  { name: 'baidu', url: 'https://baiduwangpan.app/' },
  { name: 'googletrends', url: 'https://trends.google.com/trends/explore?date=all&q=npm,webpack,vite,vue,react' },
  { name: 'stateofjs', url: 'https://stateofjs.com/en-US' },
  { name: 'music', url: 'https://y.wjhe.top/' },
  { name: '中国科学技术大学测速网站', url: 'https://test.ustc.edu.cn/' },
  { name: 'fast', url: 'https://fast.com/' },
  { name: 'localsend', url: 'https://localsend.org/' },
  {
    name: '系统设计',
    url: 'https://learning-guide.gitbook.io/system-design-interview/xi-tong-she-ji-mian-shi-nei-mu-zhi-nan-di-yi-juan/chapter-01-scale-from-zero-to-millions-of-users',
  },
  {
    name: 'learngraph',
    url: 'https://www.learngraph.online/',
  }
].map((item, index) => ({ ...item, id: index + 1 }));

const storedItems = ref<NavItem[]>([]);
const navItems = computed(() => [...staticNavItems, ...storedItems.value]);

const loadStoredItems = (): NavItem[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem('navList');
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as Array<Partial<NavItem>>;
    return parsed
      .filter((entry): entry is NavItem => typeof entry?.name === 'string' && typeof entry?.url === 'string')
      .map((entry, index) => ({
        id: entry.id ?? Date.now() + index,
        name: entry.name,
        url: entry.url,
      }));
  } catch (error) {
    console.warn('[NavList] Failed to parse stored nav list', error);
    return [];
  }
};

const persistStoredItems = (items: NavItem[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem('navList', JSON.stringify(items.map(({ id, ...rest }) => ({ ...rest, id }))));
};

onMounted(async () => {
  storedItems.value = loadStoredItems();
});
</script>
