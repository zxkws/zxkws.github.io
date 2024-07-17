MVC 

model view controller

拿java举例
controller -> service -> model -> DB

访问首页， 命中 controller 下的一个文件 ，比如这个目录下的 controller/home.java 文件 的index 方法。 这个方法根据不同的url来解析参数，进入不同的service，比如，menuService，newsService等等

比如在数据库中如何存菜单
1 首页
2 新闻列表
3 热点新闻 parentId 2
4 实时动态 2 
这个数据在model层组装成对象 [
    {
        1
    },
    {
        2,
        children: [{3},{4}]
    }
]

controller拿到这个数据之后会去找对应的html模版，或者jsp模版，把数据嵌入进去，然后把模版返回前端。


现在呢，只需要controller层返回数据，剩下的交给前端处理。


有了npm就可以创建一个工程环境
npm 可以理解成一个包下载管理工具
每一个npm管理的工程下面，都有一个package.json
npm run 可以运行scripts中的 命令,
node_modules目录下有一个.bin目录，比如下面有一个jest文件，
我们在终端直接执行jest是不行的
```json
{
    "scripts": {
        "test": "jest"
    }
}
```
如果执行 npm run test是可以的，在package.json中的命令行，会自动的去找 ./node_module/.bin/中去找。

如果安装了一个npm 包，这个包的package.json中有 
```json
{
    "bin": {
        "xxx":"./xxx.js"
    }
}
```
```json 这种配置生成的命令名字会和name一致
{
  "name": "your-package-name",
  "version": "1.0.0",
  "bin": "path/to/your/cli.js"
}
```
这样的配置，就会自动把这个命令注入到node_module/.bin目录下， 这是一个符号连接

当在包目录中运行 npm link 时，npm 会执行以下步骤：

cd /path/my-package
npm link
会在全局的node_modules目录下创建一个符号链接（ln -s my-package 全局的node_modules下）
会在全局的.bin目录下创建对应的符号链接
当在其他项目使用 npm link my-package 时，会在那个项目的那两个目录下创建指向全局的符号链接



node查找文件路径的方式可以让我们在引入node_modules中的包时，不用写相对路径

npx creat-react-app r-demo
