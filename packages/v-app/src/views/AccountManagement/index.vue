<template>
  <div class="account-management p-5 max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">账户管理</h1>
    
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
            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {{ editingAccount ? '更新' : '添加' }}
          </button>
          <button 
            v-if="editingAccount" 
            @click="cancelEdit"
            type="button"
            class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            取消
          </button>
        </div>
      </form>
    </div>

    <div class="account-list bg-white rounded-lg shadow-md p-6">
      <h2 class="text-xl font-semibold mb-4">账户列表</h2>
      <div class="overflow-x-auto">
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
import { ref, reactive } from 'vue';

interface Account {
  id: number;
  account: string;
  password: string;
  remark: string;
}

const accounts = ref<Account[]>([]);
const editingAccount = ref<Account | null>(null);
const form = reactive({
  account: '',
  password: '',
  remark: ''
});

const handleSubmit = () => {
  if (editingAccount.value) {
    // 更新账户
    const index = accounts.value.findIndex(a => a.id === editingAccount.value?.id);
    if (index !== -1) {
      accounts.value[index] = { ...editingAccount.value, ...form };
    }
  } else {
    // 添加新账户
    accounts.value.push({
      id: Date.now(),
      ...form
    });
  }
  resetForm();
};

const editAccount = (account: Account) => {
  editingAccount.value = account;
  form.account = account.account;
  form.password = account.password;
  form.remark = account.remark;
};

const deleteAccount = (id: number) => {
  accounts.value = accounts.value.filter(account => account.id !== id);
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