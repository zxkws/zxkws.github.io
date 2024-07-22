https://vzx6t9oio6.feishu.cn/docx/CXYqddgunoxMzwx5R40cmS7fnHh

svg的好处
svg是类xml格式，和html相似，可以把元素作为dom，它记录的是路径值，是矢量，比如circle， rect路径的过程。

canvas是 有了webgl才发挥了作用，没有webgl， canvas和svg能画的差不多。
canvas是使用html和js来实现，是浏览器厂商提供的api，可以用webgl来画图，用canvas来展示，就是画布的意思。webgl是调用了gpu

THREE.PerspectiveCamera( fov, aspect, near, far )

- fov（Field of View，视场）: 这个参数指定了摄像机的视角宽度，以度为单位。在这个例子中，fov 是 75 度。这意味着从摄像机的位置出发，能够看到的场景宽度范围是 75 度。较大的 fov 值会导致更大的视场，但也可能引起更明显的透视变形。
- aspect（长宽比）: 这是摄像机视锥体宽度和高度的比例。通常，这个值是根据渲染输出的尺寸来设置的，以防止图像被拉伸。在这个例子中，aspect 比例是通过 window.innerWidth / window.innerHeight 计算得到的，即渲染输出的宽度除以高度，保证了无论窗口大小如何变化，渲染的场景都不会失真。
- near（近裁剪面）: 这个参数定义了从摄像机到视景体最近面的距离。位于此距离之前的物体不会被渲染。在这个例子中，near 裁剪面设置为 0.1 单位。这个值应该尽可能小，但是设置得太小可能会导致深度缓冲问题。
- far（远裁剪面）: 这个参数定义了从摄像机到视景体最远面的距离。位于此距离之后的物体也不会被渲染。在这个例子中，far 裁剪面设置为 1000 单位。这个值决定了摄像机能看到多远的物体，设置得太大可能会降低渲染性能和/或导致深度缓冲问题。