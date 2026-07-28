<template>
  <div class="page">
    <div class="visual-side">
      <a class="auth-brand" href="/">
        <span class="auth-brand-mark">ϟ</span>
        <span>ZXKWS</span>
      </a>
      <slot name="visual" />
    </div>

    <div class="form-side">
      <a class="auth-brand auth-brand-mobile" href="/">
        <span class="auth-brand-mark">ϟ</span>
        <span>ZXKWS</span>
      </a>
      <slot name="form" />
    </div>

    <slot name="toast" />
  </div>
</template>
