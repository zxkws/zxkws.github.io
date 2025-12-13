const fs = require('fs');
const path = require('path');

/**
 * @zxkws/build-tools: SimpleCopyPlugin
 * 一个简单的 Webpack 插件，用于在构建过程中将指定目录下的静态文件复制到输出目录。
 * 
 * 为什么需要这个插件？
 * Webpack 默认只处理其依赖图中的模块（JS/CSS 引入的资源）。
 * 对于像 `manifest.json`, `robots.txt` 或根目录下的图标文件等，它们没有被任何 JS/CSS 模块引用，
 * Webpack 不会知道要打包它们。传统的做法是使用 `copy-webpack-plugin`。
 * 但为了避免引入新的第三方插件并保持 Monorepo 的代码可控性，我们自己实现了一个。
 *
 * 工作原理：
 * 1. 注册 `thisCompilation` 钩子，获取 `compilation` 对象。
 * 2. 注册 `processAssets` 钩子 (Webpack 5 推荐的资源处理阶段)。
 * 3. 遍历指定来源目录 (`from`) 下的所有文件。
 * 4. 对于每个文件，读取其内容，并使用 `compilation.emitAsset` 方法将其作为新的资源添加到 Webpack 的输出中。
 *    这样，Webpack 就会自动将其写入 `output.path`（通常是 `dist` 目录）。
 * 5. 可以配置 `ignore` 列表，跳过不需要复制的文件（例如 `index.html`，因为它通常由 `HtmlWebpackPlugin` 处理）。
 */
class SimpleCopyPlugin {
  /**
   * 插件构造函数
   * @param {object} options - 配置选项
   * @param {string} options.from - 源目录的路径，可以是相对路径或绝对路径。
   * @param {string} [options.to=''] - 目标子目录的路径，相对于 Webpack 的 `output.path`。
   * @param {Array<string|RegExp>} [options.ignore=[]] - 忽略的文件或路径模式列表。
   */
  constructor(options = {}) {
    if (!options.from) {
      throw new Error('SimpleCopyPlugin: "from" option is required.');
    }
    this.from = options.from;
    this.to = options.to || ''; 
    this.ignore = options.ignore || [];
    this.pluginName = 'SimpleCopyPlugin'; // 插件名称，用于调试和日志
  }

  /**
   * Webpack 插件的 apply 方法，Webpack 会在初始化时调用此方法。
   * @param {import('webpack').Compiler} compiler - Webpack Compiler 实例
   */
  apply(compiler) {
    // 注册 thisCompilation 钩子，在新的 Compilation (编译过程) 创建时调用
    compiler.hooks.thisCompilation.tap(this.pluginName, (compilation) => {
      // 注册 processAssets 钩子。这是 Webpack 5 处理 Assets 的推荐方式。
      // stage 参数定义了插件在资产处理流程中的执行顺序。
      // PROCESS_ASSETS_STAGE_ADDITIONAL 适合添加新的资产。
      compilation.hooks.processAssets.tapAsync(
        {
          name: this.pluginName,
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        (assets, callback) => {
          // 确定源目录的绝对路径
          // 如果 this.from 是相对路径，它将相对于 Webpack 的 context (通常是项目根目录) 解析
          const absoluteFrom = path.isAbsolute(this.from) 
            ? this.from 
            : path.resolve(compiler.context, this.from);

          // 检查源目录是否存在
          if (!fs.existsSync(absoluteFrom)) {
            console.warn(`[${this.pluginName}] Source directory "${absoluteFrom}" does not exist. Skipping copy.`);
            return callback(); // 源目录不存在，直接返回
          }

          /**
           * 递归读取目录，并将文件添加到 Webpack 的资产中。
           * @param {string} currentDir - 当前正在读取的目录的绝对路径
           * @param {string} relativePrefix - 当前文件相对于 `absoluteFrom` 的相对路径前缀
           */
          const readDir = (currentDir, relativePrefix = '') => {
            const files = fs.readdirSync(currentDir); // 读取当前目录下的所有文件和子目录

            files.forEach((file) => {
              const fullPath = path.join(currentDir, file); // 文件的绝对路径
              const assetRelativePath = path.join(relativePrefix, file); // 文件在输出目录中的相对路径

              // 检查文件是否应该被忽略
              const shouldIgnore = this.ignore.some(pattern => {
                // 如果是正则表达式，则测试路径
                if (pattern instanceof RegExp) return pattern.test(assetRelativePath);
                // 如果是字符串，则检查路径是否包含该字符串
                return assetRelativePath.includes(pattern);
              });

              if (shouldIgnore) {
                // console.log(`[${this.pluginName}] Ignoring: ${assetRelativePath}`);
                return; // 跳过被忽略的文件
              }

              const stat = fs.statSync(fullPath);

              if (stat.isDirectory()) {
                // 如果是目录，则递归读取
                readDir(fullPath, assetRelativePath);
              } else {
                // 如果是文件，则读取其内容并添加到 Webpack 资产中
                const content = fs.readFileSync(fullPath);
                
                // assetPath 是最终在输出目录中的路径
                // path.join 会处理不同操作系统的路径分隔符，然后 .replace(/\/g, '/') 统一为 Unix 风格
                const assetPath = path.join(this.to, assetRelativePath).replace(/\/g, '/');
                
                // compilation.emitAsset 用于将资源添加到 Webpack 的输出中
                // RawSource 是 Webpack 提供的用于包装原始文件内容的 Source 类型
                compilation.emitAsset(assetPath, new compiler.webpack.sources.RawSource(content));
                // console.log(`[${this.pluginName}] Copied: ${fullPath} to ${assetPath}`);
              }
            });
          };

          // 从源目录开始读取并复制
          readDir(absoluteFrom);
          callback(); // 告知 Webpack 异步操作已完成
        }
      );
    });
  }
}

module.exports = { SimpleCopyPlugin };
