<template>
  <div class="account-management p-5 max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">账户管理</h1>
    
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>
    
    <div class="account-form bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">{{ editingAccount ? '编辑账户' : '添加账户' }}</h2>
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="form-group">
          <label class="block text-sm font-medium text-gray-700 mb-1">账号</label>
          <input 
            v-model="form.account" 
            type="text" 
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div class="form-group">
          <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
          <input 
            v-model="form.password" 
            type="password" 
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div class="form-group">
          <label class="block text-sm font-medium text-gray-700 mb-1">备注</label>
          <textarea 
            v-model="form.remark"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          ></textarea>
        </div>
        <div class="flex space-x-3">
          <button 
            type="submit" 
            :disabled="loading"
            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {{ loading ? '处理中...' : (editingAccount ? '更新' : '添加') }}
          </button>
          <button 
            v-if="editingAccount" 
            @click="cancelEdit"
            type="button"
            :disabled="loading"
            class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
          >
            取消
          </button>
        </div>
      </form>
    </div>

    <div class="account-list bg-white rounded-lg shadow-md p-6">
      <h2 class="text-xl font-semibold mb-4">账户列表</h2>
      <div v-if="loadingAccounts" class="text-center py-4">
        加载中...
      </div>
      <div v-else-if="accounts.length === 0" class="text-center py-4 text-gray-500">
        暂无账户数据
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">账号</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">密码</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">备注</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="account in accounts" :key="account.id">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ account.account }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ account.password }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ account.remark }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button 
                  @click="editAccount(account)"
                  class="text-indigo-600 hover:text-indigo-900 mr-3"
                >
                  编辑
                </button>
                <button 
                  @click="deleteAccount(account.id)"
                  class="text-red-600 hover:text-red-900"
                >
                  删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue';
import { 
  createAccount, 
  getAccounts, 
  updateAccount, 
  deleteAccount as deleteAccountApi 
} from '@/http';

interface Account {
  id: number;
  account: string;
  password: string;
  remark: string;
}

const accounts = ref<Account[]>([]);
const editingAccount = ref<Account | null>(null);
const loading = ref(false);
const loadingAccounts = ref(false);
const error = ref('');

const form = reactive({
  account: '',
  password: '',
  remark: ''
});

onMounted(() => {
  fetchAccounts();
});

const fetchAccounts = async () => {
  try {
    loadingAccounts.value = true;
    accounts.value = await getAccounts();
  } catch (err) {
    error.value = '获取账户列表失败';
    console.error(err);
  } finally {
    loadingAccounts.value = false;
  }
};

const handleSubmit = async () => {
  try {
    loading.value = true;
    error.value = '';
    
    if (editingAccount.value) {
      // 更新账户
      await updateAccount(editingAccount.value.id, form);
    } else {
      // 添加新账户
      await createAccount(form);
    }
    
    resetForm();
    await fetchAccounts();
  } catch (err) {
    error.value = editingAccount.value ? '更新账户失败' : '添加账户失败';
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const editAccount = (account: Account) => {
  editingAccount.value = account;
  form.account = account.account;
  form.password = account.password;
  form.remark = account.remark;
};

const deleteAccount = async (id: number) => {
  if (!confirm('确定要删除此账户吗？')) return;
  
  try {
    await deleteAccountApi(id);
    await fetchAccounts();
  } catch (err) {
    error.value = '删除账户失败';
    console.error(err);
  }
};

const cancelEdit = () => {
  resetForm();
};

const resetForm = () => {
  editingAccount.value = null;
  form.account = '';
  form.password = '';
  form.remark = '';
};
</script>

<style scoped>
/* 保留空style标签以确保scoped样式工作 */
</style>