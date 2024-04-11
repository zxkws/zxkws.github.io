### 拖拽学习

首先元素上要写 dragable

拖拽会有两个元素，一个是当前element， 一个是目标元素，即放置到哪里，drop时和哪个元素交互  ,还可以增加一个拖拽指示器来标识将会拖拽到哪里
一个元素是否 allowDrag      一个元素是否 allowDrop  
可以被drop的元素应当有状态变化来提升可以drop。
draggingNode 一个被拖拽中的元素。

一个拖拽中的状态
dragState = {
    draagingNode: null,
    dropNode: null,

    allowDrop: true,  额外的
    showDropIndicator: false,  额外的
}

拖拽开始时
dragstart(e){
    // 设置draagingNode
    dragState.draagingNode = xxxx1;
    

}

dragover(e) {
// 
dragState.dropNode = xxxx2; 这句要先判断

// 此时可以判断当前node和上一个dropNode是否一致，来修改样式
一样时

// 另外还可以判断是否可以drop
// 如果可以 ，则判断是插入到dropNode的 pre，inner， next，这三个位置是否都可以drop，只要有一个可以，就可以给dropNode赋值，

// 此时还可以判断一下，pre，inner， next这几个节点，是否等于draggingNode.node，如果等于则不能drop了,还要判断原位置 或是 移动至自身的也不能drop

// 然后拿到dropNode
获取一下target元素的getBoundingClientRect
然后根据鼠标的坐标和target的坐标比较一下 // 判断一下插入到哪个位置
}

drop(){
获取两个元素的位置，调用dom的removeChild，insertChild，insertBefore，insertAfter或操作数据
释放样式，销毁draggState
}



help
```
// 在拖动开始时设置数据
document.getElementById("dragElement").addEventListener("dragstart", function(event) {
  event.dataTransfer.setData("text/plain", "这是拖动的数据");
});

// 在放置目标上处理拖放数据
document.getElementById("dropTarget").addEventListener("drop", function(event) {
  // 阻止默认行为
  event.preventDefault();
  // 获取拖动的数据
  var data = event.dataTransfer.getData("text/plain");
  console.log(data); // 输出: 这是拖动的数据
});

// 设置拖放效果
document.getElementById("dropTarget").addEventListener("dragover", function(event) {
  // 阻止默认行为
  event.preventDefault();
  // 设置拖放效果为复制
  event.dataTransfer.dropEffect = "copy";
});

```

拖拽修改元素宽高学习

修改一个元素的样式cursor 为row-resize，col-resize

在 mousedown 时，
设置一个 dragstate，包括鼠标的X位置,前一个元素的宽,前一个元素距离left-border距离屏幕左边界，right-border距离屏幕左边界，以及其父元素距离左边界的位置，
此时dragstate的left就是 上一个元素right-border距离屏幕左边界的指，
此时可以把selectstart和ondragstart事件return false来避免文本选择和元素拖拽，以提升用户体验或防止用户进行不期望的操作
然后定一个mousemove，在document触发mousemove时，根据鼠标的clientX来修改目标元素的宽，
在触发mouseup时，执行一些自己的逻辑，（例如，dragend）并销毁这些方法，例如selectstart，ondragstart，mousemove，mouseup，移除样式