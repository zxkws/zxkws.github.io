<template>
  <div class="page">
    <div class="visual-side">
      <slot name="visual" />
    </div>

    <div class="form-side">
      <slot name="form" />
    </div>

    <slot name="toast" />
  </div>
</template>

