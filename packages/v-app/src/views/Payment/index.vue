<script lang="ts" setup>
import QRCode from 'qrcode';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import fetch from '@/http/fetch';

type Provider = 'wechat' | 'alipay';
type OrderStatus = 'pending' | 'paid' | 'closed' | 'failed';

interface PaymentOrder {
  id: string;
  outTradeNo: string;
  provider: Provider;
  subject: string;
  amountFen: number;
  status: OrderStatus;
  platformTradeNo: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiEnvelope<T> {
  code: number;
  data: T;
  message: string;
}

interface CreateOrderResult {
  order: PaymentOrder;
  launch: { type: 'qr_code' | 'redirect'; value: string };
}

const LAST_ORDER_KEY = 'v-app:last-payment-order-id';
const provider = ref<Provider>('wechat');
const subject = ref('');
const amountYuan = ref('');
const order = ref<PaymentOrder | null>(null);
const qrCodeDataUrl = ref('');
const submitting = ref(false);
const syncing = ref(false);
const errorMessage = ref('');
let pollTimer: number | undefined;

const toFen = (value: string) => {
  const [yuan, decimal = ''] = value.split('.');
  return Number(yuan) * 100 + Number(decimal.padEnd(2, '0'));
};

const canSubmit = computed(
  () => subject.value.trim() !== '' && /^\d+(\.\d{1,2})?$/.test(amountYuan.value) && toFen(amountYuan.value) > 0,
);

const unwrap = <T,>(response: ApiEnvelope<T>) => response.data;

const clearPolling = () => {
  if (pollTimer !== undefined) window.clearInterval(pollTimer);
  pollTimer = undefined;
};

const fetchOrder = async (id: string, sync = false) => {
  syncing.value = true;
  try {
    const response = await fetch<ApiEnvelope<PaymentOrder>>(
      `/v1/payments/orders/${id}${sync ? '/sync' : ''}`,
      undefined,
      { method: sync ? 'POST' : 'GET' },
    );
    order.value = unwrap(response);
    if (order.value.status !== 'pending') clearPolling();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    syncing.value = false;
  }
};

const startPolling = () => {
  clearPolling();
  pollTimer = window.setInterval(() => {
    if (order.value?.status === 'pending') void fetchOrder(order.value.id);
  }, 3000);
};

const createOrder = async () => {
  if (!canSubmit.value) return;
  submitting.value = true;
  errorMessage.value = '';
  qrCodeDataUrl.value = '';
  try {
    const response = await fetch<ApiEnvelope<CreateOrderResult>>('/v1/payments/orders', {
      provider: provider.value,
      subject: subject.value,
      amountFen: toFen(amountYuan.value),
    });
    const result = unwrap(response);
    order.value = result.order;
    localStorage.setItem(LAST_ORDER_KEY, result.order.id);
    if (result.launch.type === 'redirect') {
      window.location.assign(result.launch.value);
      return;
    }
    qrCodeDataUrl.value = await QRCode.toDataURL(result.launch.value, { width: 240, margin: 1 });
    startPolling();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    submitting.value = false;
  }
};

const reset = () => {
  clearPolling();
  localStorage.removeItem(LAST_ORDER_KEY);
  order.value = null;
  qrCodeDataUrl.value = '';
  errorMessage.value = '';
};

onMounted(async () => {
  const id = localStorage.getItem(LAST_ORDER_KEY);
  if (!id) return;
  await fetchOrder(id, new URLSearchParams(window.location.search).has('out_trade_no'));
  if (order.value?.status === 'pending') startPolling();
});

onBeforeUnmount(clearPolling);
</script>

<template>
  <main class="payment-page">
    <section class="payment-card">
      <div class="title-row">
        <div>
          <h1>支付</h1>
          <p>创建收款订单后，使用微信扫码或跳转支付宝完成支付。</p>
        </div>
        <button v-if="order" class="secondary-button" type="button" @click="reset">新建订单</button>
      </div>

      <form v-if="!order" class="payment-form" @submit.prevent="createOrder">
        <label>
          <span>订单标题</span>
          <input v-model="subject" maxlength="127" placeholder="请输入订单标题" required />
        </label>
        <label>
          <span>金额（元）</span>
          <input v-model="amountYuan" inputmode="decimal" placeholder="0.01" required />
        </label>

        <fieldset>
          <legend>支付方式</legend>
          <label class="provider-option" :class="{ selected: provider === 'wechat' }">
            <input v-model="provider" type="radio" value="wechat" />
            <span>微信支付</span>
          </label>
          <label class="provider-option" :class="{ selected: provider === 'alipay' }">
            <input v-model="provider" type="radio" value="alipay" />
            <span>支付宝</span>
          </label>
        </fieldset>

        <button class="primary-button" type="submit" :disabled="!canSubmit || submitting">
          {{ submitting ? '正在创建订单' : '立即支付' }}
        </button>
      </form>

      <section v-else class="order-result">
        <dl>
          <div>
            <dt>id</dt>
            <dd>{{ order.id }}</dd>
          </div>
          <div>
            <dt>outTradeNo</dt>
            <dd>{{ order.outTradeNo }}</dd>
          </div>
          <div>
            <dt>provider</dt>
            <dd>{{ order.provider }}</dd>
          </div>
          <div>
            <dt>subject</dt>
            <dd>{{ order.subject }}</dd>
          </div>
          <div>
            <dt>amountFen</dt>
            <dd>{{ order.amountFen }}</dd>
          </div>
          <div>
            <dt>status</dt>
            <dd>{{ order.status }}</dd>
          </div>
          <div>
            <dt>platformTradeNo</dt>
            <dd>{{ order.platformTradeNo }}</dd>
          </div>
          <div>
            <dt>paidAt</dt>
            <dd>{{ order.paidAt }}</dd>
          </div>
        </dl>

        <div v-if="qrCodeDataUrl && order.status === 'pending'" class="qr-panel">
          <img :src="qrCodeDataUrl" alt="微信支付二维码" />
          <p>请使用微信扫码支付</p>
        </div>

        <button
          v-if="order.status === 'pending'"
          class="primary-button"
          type="button"
          :disabled="syncing"
          @click="fetchOrder(order.id, true)"
        >
          {{ syncing ? '查询中' : '我已支付，查询结果' }}
        </button>
      </section>

      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    </section>
  </main>
</template>

<style scoped>
.payment-page {
  min-height: 100%;
  padding: 32px 20px;
  background: #f6f7f9;
  color: #171717;
}
.payment-card {
  width: min(720px, 100%);
  margin: 0 auto;
  padding: 28px;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 12px 36px rgb(15 23 42 / 8%);
}
.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}
h1 {
  margin: 0;
  font-size: 28px;
}
.title-row p {
  margin: 8px 0 0;
  color: #64748b;
}
.payment-form {
  display: grid;
  gap: 20px;
  margin-top: 28px;
}
.payment-form > label {
  display: grid;
  gap: 8px;
  font-weight: 600;
}
input {
  padding: 11px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font: inherit;
}
fieldset {
  display: flex;
  gap: 12px;
  margin: 0;
  padding: 0;
  border: 0;
}
legend {
  margin-bottom: 8px;
  font-weight: 600;
}
.provider-option {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  cursor: pointer;
}
.provider-option.selected {
  border-color: #2563eb;
  background: #eff6ff;
}
button {
  font: inherit;
  cursor: pointer;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.primary-button {
  width: 100%;
  padding: 12px 16px;
  border: 0;
  border-radius: 9px;
  background: #2563eb;
  color: #fff;
  font-weight: 700;
}
.secondary-button {
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
}
.order-result {
  display: grid;
  gap: 22px;
  margin-top: 28px;
}
dl {
  display: grid;
  gap: 1px;
  overflow: hidden;
  margin: 0;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #e2e8f0;
}
dl div {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  background: #fff;
}
dt,
dd {
  min-width: 0;
  margin: 0;
  padding: 10px 12px;
  overflow-wrap: anywhere;
}
dt {
  color: #64748b;
}
.qr-panel {
  text-align: center;
}
.qr-panel img {
  width: 240px;
  max-width: 100%;
}
.qr-panel p {
  margin: 8px 0 0;
}
.error-message {
  margin: 20px 0 0;
  color: #dc2626;
  overflow-wrap: anywhere;
}
@media (prefers-color-scheme: dark) {
  .payment-page {
    background: #0f172a;
    color: #e2e8f0;
  }
  .payment-card,
  dl div {
    background: #1e293b;
  }
  .payment-card {
    border-color: #334155;
  }
  input,
  .provider-option {
    border-color: #475569;
  }
  .provider-option.selected {
    background: #1e3a5f;
  }
  .secondary-button {
    border-color: #475569;
    background: #1e293b;
    color: #e2e8f0;
  }
  dl {
    border-color: #334155;
    background: #334155;
  }
}
@media (max-width: 560px) {
  .payment-page {
    padding: 16px 10px;
  }
  .payment-card {
    padding: 20px 16px;
  }
  fieldset {
    flex-direction: column;
  }
  dl div {
    grid-template-columns: 112px minmax(0, 1fr);
  }
}
</style>
