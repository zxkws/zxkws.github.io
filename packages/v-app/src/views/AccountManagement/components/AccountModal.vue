<template>
  <div v-if="visible" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" @click="handleCancel"></div>

      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                {{ isEdit ? '编辑账户' : '添加账户' }}
              </h3>
              <div class="mt-4 space-y-4">
                <div class="form-group">
                  <label class="block text-sm font-medium text-gray-700 mb-1">名称 <span class="text-red-500">*</span></label>
                  <input
                    v-model="form.name"
                    type="text"
                    required
                    placeholder="例如：我的GitHub主账号"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div class="form-group">
                  <label class="block text-sm font-medium text-gray-700 mb-1">平台 <span class="text-red-500">*</span></label>
                  <input
                    v-model="form.platform"
                    type="text"
                    required
                    placeholder="例如：github, aws, mysql"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div class="form-group">
                  <label class="block text-sm font-medium text-gray-700 mb-1">账号/用户名</label>
                  <input
                    v-model="form.account"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div class="form-group">
                  <label class="block text-sm font-medium text-gray-700 mb-1">密码/密钥/Token</label>
                  <input
                    v-model="form.secret"
                    type="password"
                    placeholder="留空则不修改"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div class="form-group">
                  <label class="block text-sm font-medium text-gray-700 mb-1">额外信息 (JSON)</label>
                  <textarea
                    v-model="extraJson"
                    rows="3"
                    placeholder='{"key": "value"}'
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            :disabled="loading"
            @click="handleSubmit"
          >
            {{ loading ? '提交中...' : '确定' }}
          </button>
          <button
            type="button"
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            @click="handleCancel"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref, watch, computed } from 'vue';

interface Props {
  visible: boolean;
  loading: boolean;
  initialData?: any;
}

const props = defineProps<Props>();
const emit = defineEmits(['update:visible', 'submit']);

const isEdit = computed(() => !!props.initialData);

const form = reactive({
  name: '',
  platform: '',
  account: '',
  secret: '',
  extra: null as any,
});

const extraJson = ref('');

watch(
  () => props.initialData,
  (val) => {
    if (val) {
      form.name = val.name;
      form.platform = val.platform;
      form.account = val.account;
      form.secret = ''; // 编辑时不回显密码
      form.extra = val.extra;
      extraJson.value = val.extra ? JSON.stringify(val.extra, null, 2) : '';
    } else {
      form.name = '';
      form.platform = '';
      form.account = '';
      form.secret = '';
      form.extra = null;
      extraJson.value = '';
    }
  },
  { immediate: true }
);

const handleCancel = () => {
  emit('update:visible', false);
};

const handleSubmit = () => {
  if (!form.name || !form.platform) {
    alert('名称和平台为必填项');
    return;
  }

  try {
    if (extraJson.value) {
      form.extra = JSON.parse(extraJson.value);
    } else {
      form.extra = null;
    }
  } catch (e) {
    alert('额外信息 JSON 格式错误');
    return;
  }

  emit('submit', { ...form });
};
</script>
