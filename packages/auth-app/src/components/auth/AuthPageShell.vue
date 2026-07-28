<template>
  <div class="page">
    <div class="visual-side">
      <a class="auth-brand" href="/">
        <span class="auth-brand-mark">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="12" r="6.5" />
            <circle cx="11" cy="12" r="2.25" />
            <path d="M2.5 12H4M18 12h3.5M11 3.5V2M11 22v-1.5" />
          </svg>
        </span>
        <span class="auth-brand-words">
          <strong>光域</strong>
          <small>LIGHTSPACE</small>
        </span>
      </a>
      <slot name="visual" />
    </div>

    <div class="form-side">
      <a class="auth-brand auth-brand-mobile" href="/">
        <span class="auth-brand-mark">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="12" r="6.5" />
            <circle cx="11" cy="12" r="2.25" />
            <path d="M2.5 12H4M18 12h3.5M11 3.5V2M11 22v-1.5" />
          </svg>
        </span>
        <span class="auth-brand-words">
          <strong>光域</strong>
          <small>LIGHTSPACE</small>
        </span>
      </a>
      <slot name="form" />
    </div>

    <slot name="toast" />
  </div>
</template>
