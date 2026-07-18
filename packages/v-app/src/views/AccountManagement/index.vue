<template>
  <div class="account-management w-full h-full min-h-0 p-5 flex flex-col text-left">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">账户管理</h1>
      <button
        @click="openCreateModal"
        class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        添加账户
      </button>
    </div>

    <div
      v-if="error"
      class="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200 px-4 py-3 rounded mb-4"
    >
      {{ error }}
    </div>

    <div class="account-list bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden flex-1 min-h-0 flex flex-col">
      <div v-if="loadingAccounts" class="flex-1 min-h-0 flex flex-col items-center justify-center py-10">
        <svg class="animate-spin h-8 w-8 text-indigo-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-2 text-gray-500 dark:text-gray-300">加载中...</p>
      </div>
      <div v-else-if="accounts.length === 0" class="flex-1 min-h-0 flex items-center justify-center py-10 text-gray-500 dark:text-gray-300">暂无账户数据</div>
      <div v-else class="flex-1 min-h-0 overflow-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50 dark:bg-gray-900/40">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">名称</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">平台</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">账号</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">更新时间</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="account in accounts" :key="account.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/40">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{{ account.name }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">
                  {{ account.platform }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{{ account.account }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{{ account.uts }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button @click="editAccount(account)" class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-200 mr-4">编辑</button>
                <button @click="deleteAccount(account.id)" class="text-red-600 hover:text-red-900 dark:text-red-300 dark:hover:text-red-200">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <AccountModal
      v-model:visible="modalVisible"
      :loading="submitting"
      :initial-data="editingAccount"
      @submit="handleModalSubmit"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import {
  createAccount,
  getAccounts,
  updateAccount,
  deleteAccount as deleteAccountApi,
  type AccountDto,
} from '@/http';
import AccountModal from './components/AccountModal.vue';

const accounts = ref<AccountDto[]>([]);
const loadingAccounts = ref(false);
const error = ref('');

const modalVisible = ref(false);
const submitting = ref(false);
const editingAccount = ref<AccountDto | null>(null);

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

const openCreateModal = () => {
  editingAccount.value = null;
  modalVisible.value = true;
};

const editAccount = (account: AccountDto) => {
  editingAccount.value = account;
  modalVisible.value = true;
};

const handleModalSubmit = async (formData: any) => {
  try {
    submitting.value = true;
    error.value = '';
    const payload = { ...formData };

    if (editingAccount.value) {
      if (!payload.secret) delete payload.secret;
      await updateAccount(editingAccount.value.id, payload);
    } else {
      await createAccount(payload);
    }

    modalVisible.value = false;
    await fetchAccounts();
  } catch (err) {
    error.value = editingAccount.value ? '更新账户失败' : '添加账户失败';
    console.error(err);
  } finally {
    submitting.value = false;
  }
};

const deleteAccount = async (id: string) => {
  if (!confirm('确定要删除此账户吗？')) return;

  try {
    await deleteAccountApi(id);
    await fetchAccounts();
  } catch (err) {
    error.value = '删除账户失败';
    console.error(err);
  }
};
</script>

<style scoped>
</style>
