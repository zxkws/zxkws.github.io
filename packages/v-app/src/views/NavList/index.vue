<template>
  <div class="w-full h-full bg-gray-100 dark:bg-gray-900 overflow-y-auto p-4 text-left">
    <div class="mb-4 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">定时轮询保活</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">启用后，后台会按设置的分钟间隔访问目标网址进行保活。</p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        @click="openCreate"
      >
        添加网址
      </button>
    </div>

    <div v-if="error" class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
      {{ error }}
    </div>

    <div class="mb-8 overflow-x-auto rounded-lg bg-white shadow-md dark:bg-gray-800">
      <div v-if="loading" class="p-6 text-center text-gray-500 dark:text-gray-300">加载中...</div>
      <div v-else-if="storedItems.length === 0" class="p-6 text-center text-gray-500 dark:text-gray-300">
        暂无后台访问网址
      </div>
      <table v-else class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-900/40">
          <tr>
            <th class="px-4 py-3 text-left text-xs text-gray-500 dark:text-gray-300">名称</th>
            <th class="px-4 py-3 text-left text-xs text-gray-500 dark:text-gray-300">网址</th>
            <th class="px-4 py-3 text-left text-xs text-gray-500 dark:text-gray-300">间隔分钟</th>
            <th class="px-4 py-3 text-left text-xs text-gray-500 dark:text-gray-300">启用</th>
            <th class="px-4 py-3 text-left text-xs text-gray-500 dark:text-gray-300">最近状态码</th>
            <th class="px-4 py-3 text-left text-xs text-gray-500 dark:text-gray-300">最近访问时间</th>
            <th class="px-4 py-3 text-left text-xs text-gray-500 dark:text-gray-300">下次访问时间</th>
            <th class="px-4 py-3 text-left text-xs text-gray-500 dark:text-gray-300">最近错误</th>
            <th class="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-300">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="item in storedItems" :key="item.id">
            <td class="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{{ item.name }}</td>
            <td class="max-w-xs px-4 py-3 text-sm">
              <a :href="item.url" target="_blank" class="break-all text-indigo-600 hover:underline dark:text-indigo-300">{{ item.url }}</a>
            </td>
            <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{{ item.intervalMinutes }}</td>
            <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{{ item.enabled }}</td>
            <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{{ item.lastStatusCode }}</td>
            <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{{ item.lastVisitedAt }}</td>
            <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{{ item.nextVisitAt }}</td>
            <td class="max-w-xs break-all px-4 py-3 text-sm text-red-600 dark:text-red-300">{{ item.lastError }}</td>
            <td class="whitespace-nowrap px-4 py-3 text-right text-sm">
              <button class="mr-3 text-indigo-600 hover:underline dark:text-indigo-300" @click="openEdit(item)">编辑</button>
              <button class="text-red-600 hover:underline dark:text-red-300" @click="removeItem(item)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2 class="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">固定导航</h2>
    <div class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
      <a
        v-for="item in staticNavItems"
        :key="item.id"
        :href="item.url"
        target="_blank"
        class="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 flex items-center"
      >
        <span class="text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400">{{
          item.name
        }}</span>
      </a>
    </div>

    <div v-if="dialogVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="closeDialog">
      <form class="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800" @submit.prevent="saveItem">
        <h2 class="mb-5 text-xl font-semibold text-gray-900 dark:text-gray-100">{{ editingId ? '修改网址' : '添加网址' }}</h2>
        <div class="space-y-4">
          <label class="block text-sm text-gray-700 dark:text-gray-200">
            名称
            <input v-model="form.name" required maxlength="100" class="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700" />
          </label>
          <label class="block text-sm text-gray-700 dark:text-gray-200">
            网址
            <input v-model="form.url" required type="url" maxlength="2048" placeholder="https://example.com" class="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700" />
          </label>
          <label class="block text-sm text-gray-700 dark:text-gray-200">
            访问间隔（分钟）
            <input v-model.number="form.intervalMinutes" required type="number" min="1" max="525600" class="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700" />
          </label>
          <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input v-model="form.enabled" type="checkbox" />
            启用后台访问
          </label>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button type="button" class="rounded-md border px-4 py-2 dark:text-gray-200" @click="closeDialog">取消</button>
          <button type="submit" :disabled="submitting" class="rounded-md bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">
            {{ submitting ? '提交中...' : '确定' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import {
  createWebsite,
  deleteWebsite,
  getWebsites,
  updateWebsite,
  type SaveWebsiteDto,
  type WebsiteDto,
} from '@/http';

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
  },
  {
    name:'cloudstudio在线开发',
    url: 'https://cloudstudio.net/courses'
  },
  {
    name:"stackblitz",
    url:'https://stackblitz.com/',
  },
  {
    name:"stackblitz",
    url:'https://stackblitz.com/',
  },
  {
    name:"codepen",
    url:'https://codepen.io/',
  },
  {
    name:"codesandbox",
    url:'https://codesandbox.io/',
  },
  {
    name: 'gitee',
    url: 'https://gitee.com/explore'
  },
  {
    name: 'huaweicloud',
    url: 'https://devcloud.cn-north-4.huaweicloud.com/home'
  },
].map((item, index) => ({ ...item, id: index + 1 }));

const storedItems = ref<WebsiteDto[]>([]);
const loading = ref(false);
const submitting = ref(false);
const error = ref('');
const dialogVisible = ref(false);
const editingId = ref<string | null>(null);
const form = reactive<SaveWebsiteDto>({ name: '', url: '', intervalMinutes: 60, enabled: true });

const loadItems = async () => {
  loading.value = true;
  error.value = '';
  try {
    storedItems.value = await getWebsites();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '获取网址列表失败';
  } finally {
    loading.value = false;
  }
};

const openCreate = () => {
  editingId.value = null;
  Object.assign(form, { name: '', url: '', intervalMinutes: 60, enabled: true });
  dialogVisible.value = true;
};

const openEdit = (item: WebsiteDto) => {
  editingId.value = item.id;
  Object.assign(form, {
    name: item.name,
    url: item.url,
    intervalMinutes: item.intervalMinutes,
    enabled: item.enabled,
  });
  dialogVisible.value = true;
};

const closeDialog = () => {
  if (!submitting.value) dialogVisible.value = false;
};

const saveItem = async () => {
  submitting.value = true;
  error.value = '';
  try {
    if (editingId.value) await updateWebsite(editingId.value, { ...form });
    else await createWebsite({ ...form });
    dialogVisible.value = false;
    await loadItems();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存网址失败';
  } finally {
    submitting.value = false;
  }
};

const removeItem = async (item: WebsiteDto) => {
  if (!confirm(`确定要删除 ${item.name} 吗？`)) return;
  error.value = '';
  try {
    await deleteWebsite(item.id);
    await loadItems();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '删除网址失败';
  }
};

onMounted(loadItems);
</script>
