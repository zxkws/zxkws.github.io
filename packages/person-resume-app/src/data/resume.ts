export type Metric = { label: string; value: string };
export type SkillGroup = { name: string; items: string[] };
export type Experience = {
  period: string;
  org: string;
  role: string;
  highlights: string[];
  tech: string[];
};
export type Project = {
  name: string;
  focus: string;
  outcomes: string[];
  stack: string[];
};

export const profile = {
  alias: '前端工程师',
  title: '前端工程师 / 微前端 & 平台研发',
  headline: '专注 B 端体验、工程效率与可观测性',
  summary: [
    '5+ 年前端研发经验，覆盖大模型平台、云监控、接口管理、PDM / 收益管理等 B 端产品。',
    '熟悉 Vue2/3、React、TypeScript，能在单页、微前端、iframe 混合场景下快速落地。',
    '深度参与工程化：Webpack/Vite 优化、CI/CD、发布治理、调试与自动化测试链路。',
  ],
  metrics: [
    { label: '经验', value: '5+ 年' },
    { label: '主栈', value: 'Vue · React · TS' },
    { label: '工程', value: '微前端 / Webpack / Vite / CI/CD' },
    { label: '领域', value: 'LLM · 监控 · 接口管理 · PDM' },
  ] as Metric[],
  notice: '联系方式、身份标识等已脱敏；如需查看完整版 PDF，请通过授权渠道获取。',
};

export const skillGroups: SkillGroup[] = [
  {
    name: '前端框架',
    items: ['Vue 2 & class-component', 'Vue 3 组合式 API', 'React 18/19', 'TypeScript', 'Ant Design / Element'],
  },
  {
    name: '工程效能',
    items: [
      '微前端（ice-stark）',
      'Webpack / Vite 优化',
      '模块拆分与按需加载',
      'lint-staged + husky',
      '自动化发布与灰度',
    ],
  },
  {
    name: '后端与数据',
    items: ['Node.js (Express / Koa)', 'MongoDB / PostgreSQL', '接口 Mock 与网关联调', 'CI/CD 集成 Jenkins/pm2'],
  },
  {
    name: '质量与体验',
    items: [
      '可观测性与告警埋点',
      'UI 自动化（XPath 协助）',
      '性能优化与缓存策略',
      '跨团队调试基线（Charles/代理配置）',
    ],
  },
];

export const experiences: Experience[] = [
  {
    period: '2023.10 – 现在',
    org: '智能终端大模型平台',
    role: '前端工程师',
    highlights: [
      '基于 Vue2 + class-component 开发大模型对话、角色扮演等核心功能，保持旧框架下的可维护性。',
      '为报表查询条件增加前端缓存与还原逻辑，降低重复查询成本。',
      '优化标注项目测试环境的打包与部署方式，减少环境切换带来的发布风险。',
    ],
    tech: ['Vue2', 'class-component', '微前端', 'Webpack', 'CI/CD'],
  },
  {
    period: '2021.02 – 2023.10',
    org: '云监控平台',
    role: '前端工程师',
    highlights: [
      '主导 Angular 项目向 React 重构并拆分微应用，加快首屏与按需加载速度。',
      '引入 CSS Modules 与 hash 方案，解决样式污染与分片加载错配问题。',
      '为团队配置 Charles 代理与环境切换脚本，提升联调与测试效率。',
      '支持测试同事以 XPath 做 UI 自动化，沉淀跨产品路由跳转 npm 包，实现参数化跳转和配置化兼容。',
    ],
    tech: ['React', 'Webpack', 'Micro-frontend', 'CSS Modules', 'Node 工具链'],
  },
  {
    period: '2020.08 – 2021.01',
    org: '接口管理平台二次开发（Yapi）',
    role: '前端工程师',
    highlights: [
      '完成 Ant Design 4 升级与 ykit → Webpack4 迁移，显著缩短构建时间。',
      '优化打包（多线程、资源压缩），并对接 Jenkins / pm2，提供一键 CI/CD 部署。',
      '为测试同事提供可复用的部署与回滚接口，提升迭代稳定性。',
    ],
    tech: ['React', 'Webpack4', 'MongoDB', 'Node.js', 'Ant Design'],
  },
  {
    period: '2019.11 – 2021.01',
    org: 'PDM 绩效管理系统',
    role: '前端工程师',
    highlights: [
      '抽象报表通用功能为独立业务组件，支持灵活导出 Excel。',
      '推动 Git commit 规范落地，结合 prettier/eslint/husky/commitlint 保证代码一致性。',
    ],
    tech: ['Vue', 'Axios', 'Element UI', 'PostgreSQL', 'Spring Boot'],
  },
  {
    period: '2019.04 – 2020.07',
    org: '航空收益系统（nRise）',
    role: '前端工程师',
    highlights: [
      '实现登录注册、密码强度校验与滑块验证码，强化账号安全。',
      '用 ECharts 交互式呈现收益数据（条形图、甘特图等），并按需加载提升性能。',
      '交付 Excel 导入导出与表格联动、旧接口与新接口一键切换，兼顾迁移平滑性。',
      '在配套 App 中编写 Flutter 页，串联 Jenkins 流水线与 Sonar 扫描。',
    ],
    tech: ['Vue', 'ECharts', 'Spring Boot', 'Jenkins', 'Flutter'],
  },
];

export const projects: Project[] = [
  {
    name: 'LLM 对话与标注平台',
    focus: '面向业务团队的多角色对话、标注与报表查询体验',
    outcomes: [
      '在旧版 Vue2 体系下补齐角色扮演、缓存等体验升级，降低切换成本',
      '通过更安全的发布与环境管理，减少测试环境回滚成本',
    ],
    stack: ['Vue2', 'Webpack', '类装饰器', '微前端'],
  },
  {
    name: '云监控微前端改造',
    focus: '监控/告警平台的性能与可维护性优化',
    outcomes: ['拆分微应用与路由，缩短首屏并提升按需加载能力', '统一代理、日志与 UI 自动化辅助工具，提升团队协作效率'],
    stack: ['React', 'Webpack', 'CSS Modules', '模块联邦'],
  },
  {
    name: 'Yapi 二次开发与工程化',
    focus: '接口管理平台的性能和交付效率提升',
    outcomes: ['完成 AntD/webpack 升级、打包加速与 CI/CD 全链路自动化', '提供统一的部署/回滚接口，缩短测试验证周期'],
    stack: ['React', 'AntD', 'Node.js', 'MongoDB'],
  },
];

export const education = {
  degree: '软件工程（本科）',
  graduation: '2019 年毕业',
  note: '',
};

export const workingStyle = [
  '优先解决可维护性与上线稳定性问题，习惯将调试、构建、发布工具链沉淀为脚本或文档。',
  '偏好数据驱动的性能优化：监控指标、缓存命中率、分片体积作为决策依据。',
  '在多团队协作场景主动输出使用说明、调试手册与自动化 baseline。',
];
