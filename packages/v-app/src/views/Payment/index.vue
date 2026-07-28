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
      <p class="payment-eyebrow">Payment console</p>
      <div class="title-row">
        <div>
          <h1>支付订单</h1>
          <p>创建订单后，使用微信扫码或跳转支付宝完成支付；订单状态会自动轮询。</p>
        </div>
        <button v-if="order" class="secondary-button" type="button" @click="reset">新建订单</button>
      </div>

      <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>

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
          <div class="provider-grid">
            <label class="provider-option" :class="{ selected: provider === 'wechat' }">
              <input v-model="provider" type="radio" value="wechat" />
              <span>微信支付</span>
            </label>
            <label class="provider-option" :class="{ selected: provider === 'alipay' }">
              <input v-model="provider" type="radio" value="alipay" />
              <span>支付宝</span>
            </label>
          </div>
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
          <div>
            <dt>createdAt</dt>
            <dd>{{ order.createdAt }}</dd>
          </div>
          <div>
            <dt>updatedAt</dt>
            <dd>{{ order.updatedAt }}</dd>
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
    </section>
  </main>
</template>

<style scoped>
.payment-page {
  box-sizing: border-box;
  min-height: 100%;
  padding: 32px;
  background: var(--color-canvas);
  color: var(--color-fg);
}

.payment-card {
  width: min(760px, 100%);
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-xs);
}

.payment-eyebrow {
  margin: 0 0 8px;
  color: var(--color-primary-deep);
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

h1 {
  margin: 0;
  font-size: clamp(24px, 3vw, 32px);
  letter-spacing: var(--tracking-tight);
}

.title-row p {
  margin: 8px 0 0;
  color: var(--color-fg-tertiary);
  font-size: 14px;
  line-height: 1.6;
}

.payment-form {
  display: grid;
  gap: 20px;
  margin-top: 28px;
}

.payment-form > label {
  display: grid;
  gap: 8px;
  color: var(--color-fg-secondary);
  font-size: 13px;
  font-weight: 600;
}

input {
  padding: 11px 12px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  outline: none;
  background: var(--color-surface);
  color: inherit;
  font: inherit;
}

input:focus {
  border-color: var(--color-primary-deep);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

fieldset {
  margin: 0;
  padding: 0;
  border: 0;
}

legend {
  margin-bottom: 8px;
  color: var(--color-fg-secondary);
  font-size: 13px;
  font-weight: 600;
}

.provider-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.provider-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  color: var(--color-fg-secondary);
  cursor: pointer;
}

.provider-option.selected {
  border-color: var(--color-primary-deep);
  background: var(--color-primary-muted);
  color: var(--color-fg);
}

.provider-option input {
  accent-color: var(--color-primary-deep);
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
  border: 1px solid var(--color-primary-deep);
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: 600;
}

.secondary-button {
  padding: 8px 12px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-fg);
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
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-divider);
}

dl div {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  background: var(--color-surface);
}

dt,
dd {
  min-width: 0;
  margin: 0;
  padding: 10px 12px;
  overflow-wrap: anywhere;
}

dt {
  color: var(--color-fg-tertiary);
  font-family: var(--font-mono);
  font-size: 12px;
}

dd {
  color: var(--color-fg);
  font-family: var(--font-mono);
  font-size: 12px;
}

.qr-panel {
  text-align: center;
}

.qr-panel img {
  width: 240px;
  max-width: 100%;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: #fff;
}

.qr-panel p {
  margin: 8px 0 0;
  color: var(--color-fg-tertiary);
  font-size: 13px;
}

.error-message {
  margin: 20px 0 0;
  padding: 11px 13px;
  border: 1px solid color-mix(in srgb, var(--color-danger) 45%, var(--color-border));
  border-radius: var(--radius-sm);
  background: var(--color-danger-muted);
  color: var(--color-danger);
  font-size: 13px;
  overflow-wrap: anywhere;
}

@media (max-width: 560px) {
  .payment-page {
    padding: 20px 14px;
  }

  .payment-card {
    padding: 18px 14px;
  }

  .title-row,
  .provider-grid {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  dl div {
    grid-template-columns: 1fr;
  }

  dt {
    padding-bottom: 0;
  }
}
</style>
