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

export type Education = {
  school: string;
  degree: string;
  period: string;
};

export type Profile = {
  name: string;
  title: string;
  summary: string;
  contact: {
    phone: string;
    email: string;
    github: string;
    location: string;
  };
};

export type ResumeData = {
  profile: Profile;
  skillGroups: SkillGroup[];
  experiences: Experience[];
  projects: Project[];
  education: Education;
};

export const profile = {
  name: '李慧琪',
  title: '资深前端工程师',
  contact: {
    phone: '152-xxxx-xxxx',
    email: 'loveyhcui@163.com',
    github: 'github.com/zxkws',
    location: '北京',
  },
  summary:
    '6年以上前端研发经验，专注 B 端复杂业务系统与工程化建设。精通 Vue/React 生态，具备微前端架构落地经验；擅长 Webpack/Vite 构建优化、CI/CD 自动化链路搭建与可观测性体系建设，持续提升研发效率与交付质量。',
};

export const skillGroups: SkillGroup[] = [
  {
    name: '架构与工程化',
    items: [
      '精通 Webpack/Vite 构建配置与性能优化，熟练编写 Custom Plugin/Loader',
      '深入理解微前端架构（ice-stark/Module Federation），有大型巨石应用拆分与重构经验',
      '熟练掌握 CI/CD（Jenkins/GitLab CI），搭建自动化发布与灰度基础设施',
      '掌握前端监控体系建设（Sentry/自定义探针），具备全链路排查与性能调优能力',
    ],
  },
  {
    name: '技术栈',
    items: [
      '核心：Vue 2/3（Composition API）, React 18, TypeScript, Node.js',
      'UI/可视化：Ant Design, Element Plus, ECharts, Tailwind CSS',
      '后端/数据库：NestJS, Express, MongoDB, PostgreSQL, Nginx',
    ],
  },
];

export const experiences: Experience[] = [
  {
    period: '2025.03 – 至今',
    org: '新公司名称（占位符）',
    role: '高级/资深前端工程师',
    highlights: [
      '主导核心业务线前端架构选型与落地，推进关键技术难点攻关',
      '推动工程化体系建设，优化研发流程与交付质量',
    ],
    tech: ['React/Vue', 'TypeScript', 'Architecture'],
  },
  {
    period: '2023.10 – 2025.03',
    org: '某科技公司（智能终端大模型平台）',
    role: '资深前端工程师',
    highlights: [
      '主导大模型对话平台交互架构设计，在兼容 Vue2 遗留系统的同时引入新技术栈，保障平滑演进',
      '设计并实现复杂报表系统缓存与状态还原方案，提升跨会话操作效率与稳定性',
      '重构测试环境部署流程，支持多环境并行隔离与自动化构建，将环境切换耗时从 30 分钟降至分钟级',
    ],
    tech: ['Vue2/3', 'TypeScript', 'Micro-frontend', 'Engineering'],
  },
  {
    period: '2021.02 – 2023.10',
    org: '某云服务公司（云监控平台）',
    role: '前端核心开发',
    highlights: [
      '主导云监控平台 Angular → React 重构与微前端拆分方案落地，首屏加载提升 40%',
      '引入 CSS Modules 与样式隔离策略，解决微应用间样式冲突问题',
      '搭建本地开发代理与跨域调试基础设施，统一联调链路，联调效率提升 50%+',
      '封装跨应用路由跳转 SDK，统一参数处理与权限校验，被多个内部产品线复用',
    ],
    tech: ['React', 'Micro-frontend', 'Webpack Optimization', 'SDK Design'],
  },
  {
    period: '2020.08 – 2021.01',
    org: '某互联网公司（接口管理平台）',
    role: '前端工程师',
    highlights: [
      '负责 Yapi 平台二次开发与维护，完成 ykit → Webpack4 构建迁移，构建速度提升 60%',
      '接入 Jenkins 自动化流水线，实现一键部署与秒级回滚，保障高频迭代稳定性',
      '优化大数据量接口文档渲染性能，解决列表卡顿问题',
    ],
    tech: ['React', 'Node.js', 'CI/CD', 'Performance'],
  },
  {
    period: '2019.11 – 2021.01',
    org: '某企业服务公司（PDM 系统）',
    role: '前端工程师',
    highlights: [
      '设计通用报表组件库，以配置化方式支持多业务场景，减少重复开发',
      '建立工程化规范，引入 ESLint/Prettier/Commitlint 工作流，降低代码维护成本',
    ],
    tech: ['Vue', 'Element UI', 'Engineering Standards'],
  },
  {
    period: '2019.04 – 2020.07',
    org: '某航空收益系统',
    role: '前端开发',
    highlights: [
      '负责收益管理系统核心模块开发，基于 ECharts 实现复杂数据可视化交互展示',
      '实现 Excel 数据高性能导入导出与前端校验，提升数据处理体验',
    ],
    tech: ['Vue', 'ECharts', 'Data Visualization'],
  },
];

export const projects: Project[] = [
  {
    name: '企业级大模型对话与标注平台',
    focus: '架构设计 & 体验优化',
    outcomes: [
      '在遗留代码库中推进渐进式重构，结合微前端引入新特性，降低重构风险与交付成本',
      '设计基于类装饰器的业务逻辑复用模式，减少 30% 样板代码',
    ],
    stack: ['Vue', 'TypeScript', 'Design Patterns'],
  },
  {
    name: '云监控微前端架构改造',
    focus: '性能优化 & 架构升级',
    outcomes: [
      '设计并落地基于 Module Federation 的微前端方案，实现 10+ 子应用独立部署',
      '构建统一日志采集与错误监控 SDK，覆盖全平台，提升线上问题定位效率',
    ],
    stack: ['React', 'Webpack 5', 'Micro-frontend'],
  },
];

export const education = {
  degree: '软件工程（统招本科）',
  school: '桂林航天工业学院',
  period: '2015 – 2019',
};

export const RESUME_DATA_VERSION = 2;

export const defaultResumeData: ResumeData = {
  profile,
  skillGroups,
  experiences,
  projects,
  education,
};
