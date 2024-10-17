<script setup lang="ts">
import Loading from "./Loading.vue";
import Background from "./Background.vue";
import { helloInit, checkDays } from "../utils/getTime";
import { mainStore } from "../store";

const store = mainStore();
// 页面宽度
const getWidth = () => {
  store.setInnerWidth(window.innerWidth);
};

// 加载完成事件
const loadComplete = () => {
  nextTick(() => {
    // 欢迎提示
    helloInit();
    // 默哀模式
    checkDays();
  });
};

// 监听宽度变化
watch(
  () => store.innerWidth,
  (value: any) => {
    if (value < 721) {
      store.boxOpenState = false;
      store.setOpenState = false;
    }
  }
);

onBeforeUnmount(() => {
  window.removeEventListener("resize", getWidth);
});

const showBackgroud = process.env.NODE_ENV === "production";
</script>

<template>
  <Loading v-if="showBackgroud" />
  <Background v-if="showBackgroud" @loadComplete="loadComplete" />
  <h1 class="text-3xl font-bold underline">Hello world!</h1>
  <RouterLink to="/list" class="text-3xl">list</RouterLink>
  <RouterLink to="/detail">detail</RouterLink>
</template>

<style lang="scss" scoped>
#main {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform: scale(1.2);
  transition: transform 0.3s;
  animation: fade-blur-main-in 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94)
    forwards;
  animation-delay: 0.5s;

  .container {
    width: 100%;
    height: 100vh;
    margin: 0 auto;
    padding: 0 0.5vw;

    .all {
      width: 100%;
      height: 100%;
      padding: 0 0.75rem;
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;
    }

    .more {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #00000080;
      backdrop-filter: blur(20px);
      z-index: 2;
      animation: fade 0.5s;
    }

    @media (max-width: 1200px) {
      padding: 0 2vw;
    }
  }

  .menu {
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
    top: 84%;
    left: calc(50% - 28px);
    width: 56px;
    height: 34px;
    background: rgb(0 0 0 / 20%);
    backdrop-filter: blur(10px);
    border-radius: 6px;
    transition: transform 0.3s;
    animation: fade 0.5s;

    &:active {
      transform: scale(0.95);
    }

    .i-icon {
      transform: translateY(2px);
    }

    @media (min-width: 721px) {
      display: none;
    }
  }

  @media (max-height: 720px) {
    overflow-y: auto;
    overflow-x: hidden;

    .container {
      height: 721px;

      .more {
        height: 721px;
        width: calc(100% + 6px);
      }

      @media (min-width: 391px) {
        // w 1201px ~ max
        padding-left: 0.7vw;
        padding-right: 0.25vw;

        @media (max-width: 1200px) {
          // w 1101px ~ 1280px
          padding-left: 2.3vw;
          padding-right: 1.75vw;
        }

        @media (max-width: 1100px) {
          // w 993px ~ 1100px
          padding-left: 2vw;
          padding-right: calc(2vw - 6px);
        }

        @media (max-width: 992px) {
          // w 901px ~ 992px
          padding-left: 2.3vw;
          padding-right: 1.7vw;
        }

        @media (max-width: 900px) {
          // w 391px ~ 900px
          padding-left: 2vw;
          padding-right: calc(2vw - 6px);
        }
      }
    }

    .menu {
      top: 605.64px; // 721px * 0.84
      left: 170.5px; // 391 * 0.5 - 25px

      @media (min-width: 391px) {
        left: calc(50% - 25px);
      }
    }

    .f-ter {
      top: 675px; // 721px - 46px

      @media (min-width: 391px) {
        padding-left: 6px;
      }
    }
  }

  @media (max-width: 390px) {
    overflow-x: auto;

    .container {
      width: 391px;
    }

    .menu {
      left: 167.5px; // 391px * 0.5 - 28px
    }

    .f-ter {
      width: 391px;
    }

    @media (min-height: 721px) {
      overflow-y: hidden;
    }
  }
}
</style>
