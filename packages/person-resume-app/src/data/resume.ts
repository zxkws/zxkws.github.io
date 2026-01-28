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
  title: '前端开发工程师',
  contact: {
    phone: '152-xxxx-xxxx',
    email: 'loveyhcui@163.com',
    github: 'github.com/zxkws',
    location: '北京',
  },
  summary:
    '6年+前端研发经验，专注 B 端复杂业务系统与工程化建设。主要使用React/Vue 生态，具备微前端架构落地经验；擅长 Webpack构建优化、CI/CD 自动化链路搭建与可观测性体系建设，持续提升研发效率与交付质量。',
};

export const skillGroups: SkillGroup[] = [
  {
    name: '架构与工程化',
    items: [
      '熟悉 HTML(5) / CSS(3)，能够快速搭建前端界面，熟练掌握响应式、flex 等页面布局',
      '熟悉 JavaScript, 包括闭包、原型链、promise 等，熟悉常见的 ES6 新特性',
      '熟练使用 Vue2、Vue3 全家桶，熟练使用其周边生态进行项目开发',
      '熟悉使用 React 前端开发框架并深入研究过其内部实现，熟练使用 Antd 组件库，熟悉 TypeScript 基本语法。',
      '熟悉 Nodejs 和 MongoDB 数据库，能使用 express 框架和 koa 进行服务器开发与编写接口',
      '熟练使用 Webpack 等包构建工具，并能够自己配置基础的开发环境，开发 loader/Plugin',
      '熟练使用 Git 工具进行高效多人协同开发，熟练使用 npm、yarn 等包管理工具',
      '熟练使用微前端架构（ice-stark/Module Federation），有大型巨石应用拆分与重构经验',
      '熟练掌握 CI/CD（Jenkins/GitLab CI），搭建自动化发布与灰度基础设施',
      '熟悉 Java,Shell,Maven, Gradle 等后端语言',
    ],
  },
];

export const experiences: Experience[] = [
  {
    period: '2025.03 – 至今',
    org: '上海思芮信息科技有限公司',
    role: '数据标注与合成',
    overview: '',
    projects: [],
    highlights: [
      '开发交互式标注视图功能，对于不同的数据集展示不同的视图，调用不同的模型，搭配多种MCP工具，和预定义prompt指令进行数据标注',
      'workflow节点开发，供用户在系统中搭建自己的workflow节点，完成用户业务需求',
      '开发模型prompt调优功能，让用户在页面选择不同的模型，测试自己的prompt并优化',
      '开发模型注册功能，使系统支持更多模型，供用户根据业务需求，动态选择模型',
      '海内外SSO功能迁移，项目智能告警体系搭建',
      'webpack分包+懒加载解决公共i18n常量初始化问题',
    ],
    tech: ['React', 'TypeScript', 'zustand', 'react-flow', 'rspack,webpack', 'i18n', 'nodejs'],
  },
  {
    period: '2023.10 – 2025.03',
    org: '纬创软件有限公司',
    role: '大模型平台',
    overview: '',
    projects: [],
    highlights: [
      '多环境自动化部署系统，每个后端固定对应一个前端开发分支',
      '采用微前端方案兼容 Vue2 遗留系统与 Vue3 新特性，保障业务连续迭代',
      '实现复杂报表系统的缓存与状态还原方案，支持筛选/分页/排序/钻取等多维度配置',
      '沉淀可复用的业务逻辑复用模式（装饰器/组合式能力封装），降低重复开发与维护成本',
      '使用echarts进行可视化模型训练在不同阶段产出评测结果',
      '模型注册功能，模型血缘功能追溯模型上下游',
      '标注功能，支持用户通过拖拽自定义标注页面',
    ],
    tech: [
      'Vue2/3,React',
      'Micro-frontend,Ice-stark',
      'CI/CD流程搭建',
      'TypeScript',
      'react-flow',
      'vue-class-component',
    ],
  },
  {
    period: '2021.02 – 2023.10',
    org: '武汉佰钧成技术有限责任公司',
    role: '云监控',
    overview:
      '云监控项目是一个监控系统，其主要功能是收集云资源或用户自定义的监控指标，探测服务可用性以及针\n对指标设置告警，包括数据收集、可视化、告警等功能。通过对监控指标的收集和分析，可以帮助用户更好地\n了解自己的业务，及时发现和解决问题，从而提高业务的可用性和稳定性。并通过告警设置等功能，及时通知\n用户异常情况，使得用户可以更快速地做出应对。',
    projects: [],
    highlights: [
      '提供 clarles 代理测试环境正式环境方式,帮助项目成员提高开发效率',
      '配置 cssModule 解决样式污染问题，配置 hash 解决测试环境因分片导致加载错误 js 文件问题',
      '协助测试人员使用 Xpath 定位元素进行 UI 自动化,根据项目路由开发三方 npm 工具包，供其他产品方快捷传 参跳转,对不同的产品进行配置化兼容展示,从不同的模块中抽离公共可复用逻辑,方便后期维护。',
      '参与 angular 项目重构为 react 项目,提高可维护性,根据项目菜单拆分微应用,加快页面加载速度',
      '开发项目概览页，供用户快速查看个人资源使用，云产品使用情况及告警历史等，开发应用分组，用户可以将不同的云产品分到一组，按组对云产品设置告警规则',
      '参与云监控平台微前端架构升级与性能优化',
    ],
    tech: ['React', 'Micro-frontend,Ice-stark', 'Webpack 5', 'styled-components,CSS Modules'],
  },
  {
    period: '2019.04 – 2021.01',
    org: '中国民航信息网络股份有限公司',
    role: '',
    overview: '',
    projects: [
      {
        name: 'Yapi 接口管理平台二次开发',
        description:
          '一个可本地部署的、打通前后端及可视化的接口管理平台,该项目是在开源的 Yapi 项目基础上进行的二次开\n发，主要目的是为了满足更多的业务需求和扩展功能。通过 Yapi，用户可以方便地管理接口文档，包括接口定\n义、参数说明、请求测试等等。同时，Yapi 还支持在线 Mock 数据，便于前端和后端协作开发',
        responsibilities: [
          '负责 antd 升级至 antd4,ykit 升级为 webpack4,,优化项目打包速度',
          '提供 CI/CD 自动部署项目给测试人员快捷部署,提供接口给 jenkins 调用',
          '针对项目现有的 webpack 配置进行优化（JS、图片文件与 css 的压缩、开启多线程打包等），提升项目构建速 度与首页渲染速度',
          '推动项⽬使⽤ Git commit 提交规范，通过 prettier/eslint 配合 husky+commitlint+githook 的⽅式实现代码 提交检查，确保团队内部代码⻛格和代码规范的统⼀。',
        ],
        achievements: [],
        tech: ['React', 'Node.js', 'Webpack 4', 'Jenkins', 'CI/CD'],
      },
      {
        name: '航空收益管理系统',
        description:
          '一个航空公司收益业务系统，该系统包含收益计算、收益分析、信息管理等多个功能模块，可以帮助航空\n公司高效、准确地计算、管理和分析收益情况，提高经营效率和决策水平。',
        responsibilities: [
          '实现用户登录注册、修改密码功能，进行强弱密码的检查，并增加滑块验证码登录',
          '使用 Echarts 对收益数据以条形图、甘特图等形式进行可视化展示，并实现按需加载',
          '实现 excel 导入导出功能与 table 组件的联动 ，可设置当前选中项和所有数据。',
          '将 guice+jersey 升级 springboot,在前端项目中增加开关一键切换使用新旧接口',
          '开发值机、退票、积分兑换机票页面，迁入南航收益系统到 nrise 系统,解决 mybatis 版本不一致产生的问题',
          '在 nrise 对应的 App 中使用 Flutter 开发新页面,使用 jenkins 流水线增加项目 sonar 扫描',
          '对系统各类报表通用功能进行提取，并单独封装成可复用业务组件，并统计每个人的价值点，实现数据以 excel 报表形式导出',
          '开发用于团队内部人员标记任务完成、缺陷修复、项目周期规划、绩效计算的功能，在团队协作 开发中，该系统可以帮助团队内部人员高效、准确地进行任务管理和跟踪，提高工作效率和管理水平。',
        ],
        achievements: [],
        tech: ['Vue', 'guice', 'jersery', 'springboot', 'jquery', 'jsp', 'postgresql', 'Flutter', 'mybatis', 'tomcat'],
      },
    ],
    highlights: [],
    tech: [],
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
