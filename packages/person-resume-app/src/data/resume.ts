export type SkillGroup = { name: string; items: string[] };

export type Project = {
  name: string;
  description: string;
  responsibilities: string[];
  achievements: string[];
  tech: string[];
};

export type Experience = {
  period: string;
  org: string;
  role: string;
  overview: string;
  projects: Project[];
  highlights: string[];
  tech: string[];
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
  education: Education;
};

export const profile = {
  name: '李XX',
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
    org: '上海思芮信息科技有限公司',
    role: '高级/资深前端工程师',
    overview: '负责核心业务前端研发与工程化建设（占位符，可在编辑器中补充真实项目与成果）。',
    projects: [],
    highlights: [
      '主导核心业务线前端架构选型与落地，推进关键技术难点攻关',
      '推动工程化体系建设，优化研发流程与交付质量',
    ],
    tech: ['React/Vue', 'TypeScript', 'Architecture'],
  },
  {
    period: '2023.10 – 2025.03',
    org: '纬创软件（上海）有限公司',
    role: '资深前端工程师',
    overview: '负责大模型应用前端架构设计与工程化建设，主导核心业务系统的技术选型与落地。',
    projects: [
      {
        name: '企业级大模型对话与标注平台',
        description: '服务内部 AI 团队的对话数据标注与质量评估系统，支持千万级对话数据管理与多角色协作流程。',
        responsibilities: [
          '主导前端架构设计，采用微前端方案兼容 Vue2 遗留系统与 Vue3 新特性，保障业务连续迭代',
          '设计并实现复杂报表系统的缓存与状态还原方案，支持筛选/分页/排序/钻取等多维度配置',
          '沉淀可复用的业务逻辑复用模式（装饰器/组合式能力封装），降低重复开发与维护成本',
          '建立错误监控与发布回归流程，提升线上问题定位效率与版本交付稳定性',
        ],
        achievements: [
          '通过渐进式重构降低技术债务，避免推翻重写的高昂成本与交付风险',
          '基于类装饰器的业务逻辑复用模式减少约 30% 样板代码，提升多人协作一致性',
          '跨会话状态还原功能提升用户操作效率约 40%，显著降低重复配置与误操作',
        ],
        tech: ['Vue2/3', 'TypeScript', 'Pinia', 'Micro-frontend', 'ECharts'],
      },
      {
        name: '多环境自动化部署系统',
        description: '测试环境管理平台，支持 20+ 分支并行开发与环境隔离，提升研发与测试协作效率。',
        responsibilities: [
          '重构测试环境部署流程，打通构建、发布、回滚链路，实现多环境并行隔离与自动化构建',
          '设计环境元数据与权限策略，支持按团队/分支分配资源并减少环境冲突',
          '完善环境可视化与操作指引，降低使用门槛并减少人工介入成本',
        ],
        achievements: [
          '环境切换耗时从约 30 分钟降至分钟级，显著提升测试验证效率',
          '支持 50+ 人并行开发，环境冲突率降低约 90%，减少联调阻塞',
        ],
        tech: ['CI/CD', 'Docker', 'Jenkins'],
      },
    ],
    highlights: [
      '推动团队前端工程化体系建设，制定代码规范与 Code Review 流程',
      '负责前端团队技术分享与新人培养，提升整体交付质量与协作效率',
    ],
    tech: ['Vue2/3', 'TypeScript', 'Micro-frontend', 'Engineering'],
  },
  {
    period: '2021.02 – 2023.10',
    org: '武汉佰钧成技术有限责任公司',
    role: '前端核心开发',
    overview: '负责云监控平台微前端架构升级与性能优化，推动跨团队并行交付能力建设。',
    projects: [
      {
        name: '云监控微前端架构改造',
        description:
          '大型云监控平台（10+ 子应用），从 Angular 向 React 渐进式迁移，并引入微前端实现按业务域拆分与独立交付。',
        responsibilities: [
          '制定迁移路线与拆分边界，沉淀统一基座能力（导航、鉴权、埋点、路由与错误兜底）',
          '落地 Module Federation + Webpack 5 构建方案，处理跨应用依赖共享、版本冲突与加载顺序',
          '引入 CSS Modules 与样式隔离策略，解决微应用间样式污染与覆盖问题',
          '搭建本地开发代理与跨域调试能力，统一联调链路并减少环境依赖',
        ],
        achievements: [
          '首屏加载提升约 40%，关键路径资源按需加载，交互响应更稳定',
          '实现 10+ 子应用独立部署与灰度发布，联调效率提升 50%+',
          '沉淀跨应用路由跳转 SDK 与权限校验能力，被多个内部产品线复用',
        ],
        tech: ['React', 'TypeScript', 'Webpack 5', 'Module Federation', 'CSS Modules'],
      },
    ],
    highlights: [
      '推动微前端架构在多业务域落地，建立统一的开发、构建与发布规范',
      '完善性能与稳定性指标体系（首屏、错误率、资源体积），持续迭代优化',
    ],
    tech: ['React', 'Micro-frontend', 'Webpack Optimization', 'SDK Design'],
  },
  {
    period: '2019.04 – 2021.01',
    org: '中国民航信息网络股份有限公司',
    role: '前端工程师',
    overview: '负责企业内部接口管理平台与航空收益系统的前端研发，涵盖工程化升级与数据可视化能力建设。',
    projects: [
      {
        name: 'Yapi 接口管理平台二次开发',
        description: '企业内部 API 文档管理与测试平台，覆盖多团队接口规范、协作与调试流程。',
        responsibilities: [
          '负责核心业务页面与组件的二次开发与维护，完善权限与团队协作流程',
          '完成 ykit → Webpack4 构建迁移，重构脚本与依赖策略并优化构建性能',
          '接入 Jenkins 自动化流水线，实现分支构建、自动部署与回滚，保障高频迭代稳定性',
          '优化大数据量接口文档渲染性能，解决列表/树形结构卡顿与搜索体验问题',
        ],
        achievements: [
          '构建迁移后构建速度提升约 60%，发布链路更稳定可控',
          'Jenkins 自动化流水线支持一键部署与秒级回滚，降低人为操作风险',
        ],
        tech: ['React', 'Node.js', 'Webpack 4', 'Jenkins', 'CI/CD'],
      },
      {
        name: '航空收益管理系统',
        description: '航司收益分析与预测系统，包含多维度指标分析、预测对比与运营报表导出能力。',
        responsibilities: [
          '负责收益分析与预测核心模块开发，梳理指标口径并实现多维度可视化展示',
          '基于 ECharts 封装可复用图表组件，支持联动、钻取、对比等交互',
          '实现 Excel 高性能导入导出与前端校验，提升大批量数据处理体验',
        ],
        achievements: [
          '沉淀可复用的图表组件与配置模板，提高可视化需求交付效率',
          'Excel 导入导出能力减少人工处理成本，提升运营分析效率',
        ],
        tech: ['Vue', 'ECharts', '数据可视化', 'Excel 导入导出'],
      },
      {
        name: 'PDM 系统通用报表组件库',
        description: '产品数据管理系统的通用报表组件库，支持复杂报表配置、筛选、分组与导出等能力。',
        responsibilities: [
          '抽象报表通用模型，设计字段配置、筛选条件与展示组件的可扩展协议',
          '封装表格/图表/筛选器等组件，支持多业务模块快速搭建报表页面',
          '完善工程化规范（Lint/格式化/提交规范等），降低后续维护与协作成本',
        ],
        achievements: [
          '配置化组件库覆盖多业务场景，显著减少重复开发并缩短交付周期',
          '通过工程化规范与组件边界约束，降低维护成本并提升代码一致性',
        ],
        tech: ['Vue', 'Element UI', '组件设计', '工程化'],
      },
    ],
    highlights: [
      '推动工程化与发布规范落地，提升迭代效率与线上稳定性',
      '与产品/算法/后端协作推进指标口径统一，提升数据可信度与分析一致性',
    ],
    tech: ['React', 'Vue', 'Node.js', 'CI/CD', 'ECharts', 'Data Visualization'],
  },
];

export const education = {
  degree: '软件工程（统招本科）',
  school: '桂林航天工业学院',
  period: '2015 – 2019',
};

export const RESUME_DATA_VERSION = 5;

export const defaultResumeData: ResumeData = {
  profile,
  skillGroups,
  experiences,
  education,
};
