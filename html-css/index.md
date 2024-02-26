在CSS中，外边距折叠（Margin collapsing）是指在某些情况下，两个垂直外边距会合并成一个外边距的现象。这通常发生在以下三种情况：

## 相邻兄弟元素：在一个块级元素的上外边距和下外边距之间，总是会发生外边距折叠。

```html
<div style="margin-bottom: 20px;"></div>
<div style="margin-top: 30px;"></div>
```
在这个例子中，两个div元素之间的距离是30px，而不是50px。

## 父元素与其第一个或最后一个子元素：如果一个元素的上外边距和其第一个子元素的上外边距之间没有边框、内边距、行内内容、清除或者BFC，那么这两个外边距会折叠。

```html
<div style="margin-top: 20px;">
  <div style="margin-top: 30px;"></div>
</div>
```
在这个例子中，外层div元素的上边距是30px，而不是50px。

## 空的块级元素：如果一个块级元素没有边框、内边距、行内内容、高度和最小高度，那么它的上外边距和下外边距会折叠。

```html
<div style="margin-top: 20px; margin-bottom: 30px;"></div>

```
在这个例子中，div元素的总外边距是30px，而不是50px。

注意，外边距折叠只发生在块级元素的垂直外边距之间，不会发生在行内元素、浮动元素或绝对定位元素的外边距之间。


### BFC

BFC(Block Format Context)是一个特异功能
1. 元素开启BFC后,其子元素不再产生边距折叠问题
2. 元素开启BFC后,自己不会被其他浮动元素覆盖
3. 元素开启BFC后,就算其字元素浮动，元素的高度也不会坍塌

开启BFC的方式
1. 根元素
2. 绝对定位或固定定位
3. 浮动
4. table,td tr, th, tbody, caption, tfooter.....等
5. 行内块
6. overflow不为visible
7. display: flow-root;
8. column-span: all;
9. 伸缩项目
10. 多列容器   column-count: 1