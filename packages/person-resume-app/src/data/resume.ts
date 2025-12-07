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
  name: '张三 (Placeholder)', // Changed from alias to name for formal resume
  title: '资深前端工程师',
  contact: {
    phone: '138-xxxx-xxxx',
    email: 'email@example.com',
    github: 'github.com/zxkws',
    location: '北京',
  },
  summary:
    '拥有 5 年以上前端研发经验，专注于 B 端复杂业务系统与工程化建设。精通 Vue/React 生态，具备深厚的微前端架构落地经验。擅长通过 Webpack/Vite 构建优化、CI/CD 自动化链路搭建以及可观测性体系建设，显著提升团队开发效率与交付质量。在大型监控平台、LLM 应用及企业级管理系统中有卓越的架构设计与性能优化实战成果。',
};

export const skillGroups: SkillGroup[] = [
  {
    name: '架构与工程化',
    items: [
      '精通 Webpack/Vite 构建配置与性能优化，熟练编写 Custom Plugin/Loader',
      '深入理解微前端架构 (ice-stark/Module Federation)，有大型巨石应用拆分重构经验',
      '熟练掌握 CI/CD 流程 (Jenkins/GitLab CI)，搭建自动化发布与灰度基础设施',
      '掌握前端监控体系建设 (Sentry/自定义探针)，具备全链路排查与性能调优能力',
    ],
  },
  {
    name: '技术栈',
    items: [
      '核心：Vue 2/3 (Composition API), React 18, TypeScript, Node.js',
      'UI/可视化：Ant Design, Element Plus, ECharts, Tailwind CSS',
      '后端/数据库：NestJS, Express, MongoDB, PostgreSQL, Nginx',
    ],
  },
];

export const experiences: Experience[] = [
  {
    period: '2023.10 – 至今',
    org: '某科技公司 (智能终端大模型平台)',
    role: '资深前端工程师',
    highlights: [
      '主导大模型对话平台的交互架构设计，兼容 Vue2 旧系统同时引入新技术栈，保障了业务平滑过渡。',
      '设计并实现前端复杂报表系统的缓存与状态还原方案，显著提升用户跨会话操作效率。',
      '重构测试环境部署流程，实现多环境并行隔离与自动化构建，将环境切换耗时从 30 分钟降低至分钟级。',
    ],
    tech: ['Vue2/3', 'TypeScript', 'Micro-frontend', 'Engineering'],
  },
  {
    period: '2021.02 – 2023.10',
    org: '某云服务公司 (云监控平台)',
    role: '前端核心开发',
    highlights: [
      '主导云监控平台从 Angular 向 React 的重构工作，制定微前端拆分方案，将首屏加载速度提升 40%。',
      '引入 CSS Modules 与样式隔离策略，彻底解决微应用间的样式冲突问题。',
      '搭建本地开发代理与跨域调试基础设施，统一团队开发环境，提升联调效率 50% 以上。',
      '封装跨应用路由跳转 SDK，统一参数处理与权限校验，被多个内部产品线采纳。',
    ],
    tech: ['React', 'Micro-frontend', 'Webpack Optimization', 'SDK Design'],
  },
  {
    period: '2020.08 – 2021.01',
    org: '某互联网公司 (接口管理平台)',
    role: '前端工程师',
    highlights: [
      '负责 Yapi 平台的二次开发与维护，完成从 ykit 到 Webpack4 的底层构建迁移，构建速度提升 60%。',
      '集成 Jenkins 自动化流水线，实现一键部署与秒级回滚，保障了高频迭代下的系统稳定性。',
      '优化大数据量下的接口文档渲染性能，解决了列表卡顿问题。',
    ],
    tech: ['React', 'Node.js', 'CI/CD', 'Performance'],
  },
  {
    period: '2019.11 – 2021.01',
    org: '某企业服务公司 (PDM 系统)',
    role: '前端工程师',
    highlights: [
      '设计通用报表组件库，通过配置化方式支持多种业务场景，减少重复代码开发。',
      '建立前端工程化规范，引入 ESLint/Prettier/Commitlint 工作流，显著降低代码维护成本。',
    ],
    tech: ['Vue', 'Element UI', 'Engineering Standards'],
  },
  {
    period: '2019.04 – 2020.07',
    org: '某航空收益系统',
    role: '前端开发',
    highlights: [
      '负责收益管理系统核心模块开发，利用 ECharts 实现复杂数据的可视化交互展示。',
      '实现 Excel 数据的高性能导入导出与前端校验，提升数据处理体验。',
    ],
    tech: ['Vue', 'ECharts', 'Data Visualization'],
  },
];

export const projects: Project[] = [
  {
    name: '企业级大模型对话与标注平台',
    focus: '架构设计 & 体验优化',
    outcomes: [
      '在遗留代码库中实施渐进式重构，通过微前端手段引入新特性，避免了推翻重来的高昂成本。',
      '设计了一套基于类装饰器的业务逻辑复用模式，减少了 30% 的样板代码。',
    ],
    stack: ['Vue', 'TypeScript', 'Design Patterns'],
  },
  {
    name: '云监控微前端架构改造',
    focus: '性能优化 & 架构升级',
    outcomes: [
      '设计并落地基于 Module Federation 的微前端方案，实现了 10+ 子应用的独立部署与运行。',
      '构建了统一的日志采集与错误监控 SDK，覆盖全平台，帮助团队快速定位线上问题。',
    ],
    stack: ['React', 'Webpack 5', 'Micro-frontend'],
  },
];

export const education = {
  degree: '软件工程（统招本科）',
  school: 'XX 大学',
  period: '2015 – 2019',
};
