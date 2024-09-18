export const directives = {
  draggable: { // todo
    // 当指令绑定到元素上时调用
    bind(el: HTMLElement) {
      let position = { y: 0 }; // 只记录 y 坐标
      let isDragging = false;
      let dragOffset = { y: 0 };

      const startDrag = (event) => {
        isDragging = true;
        // 记录鼠标与元素顶部的偏移量
        dragOffset.y = event.clientY - el.offsetTop;

        // 添加全局事件监听
        document.addEventListener("mousemove", onDrag);
        document.addEventListener("mouseup", stopDrag);
      };

      const onDrag = (event) => {
        if (isDragging) {
          // 计算新的 y 位置
          position.y = event.clientY - dragOffset.y;

          // 只更新元素的 top 值，不更新 left 值
          el.style.top = `${position.y}px`;
        }
      };

      const stopDrag = () => {
        isDragging = false;
        // 移除全局事件监听
        document.removeEventListener("mousemove", onDrag);
        document.removeEventListener("mouseup", stopDrag);
      };

      // 初始化元素位置为屏幕右下角
      const initPosition = () => {
        el.style.position = "fixed";
        el.style.right = "20px"; // 距离右侧20px
        el.style.bottom = "20px"; // 距离底部20px
        el.style.top = ""; // 清空 top 值
      };

      // 绑定 mousedown 事件，当鼠标按下时开始拖动
      el.addEventListener("mousedown", startDrag);

      // 初始化样式
      initPosition();
      el.style.cursor = "move";
    },
    // 当指令解绑时，清理事件监听
    unbind(el) {
      el.removeEventListener("mousedown", el.startDrag);
      document.removeEventListener("mousemove", el.onDrag);
      document.removeEventListener("mouseup", el.stopDrag);
    },
  },
};
