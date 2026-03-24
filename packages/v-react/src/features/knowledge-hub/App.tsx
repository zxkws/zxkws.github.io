import { useMemo, useState } from 'react';

import styles from './App.module.css';
import {
  backendServices,
  dataQualityIssues,
  graphNodeTypes,
  graphRagRuns,
  graphRelationshipTypes,
  ingestionPipelines,
  knowledgeMetrics,
  knowledgeSpaces,
  multimodalAssets,
  retrievalEvaluators,
  workflowPlaybooks,
} from './data/mock';
import type {
  BackendService,
  DataQualityIssue,
  GraphRagRun,
  IngestionPipeline,
  KnowledgeMetric,
  KnowledgeSpace,
  MultimodalAsset,
  RetrievalEvaluator,
  WorkflowPlaybook,
} from './types/knowledge';

type AppProps = {
  basename?: string;
};

type TabKey = 'overview' | 'text' | 'multimodal' | 'graphrag' | 'operations' | 'apis';

const TAB_CONFIG: Array<{ key: TabKey; label: string; description: string }> = [
  { key: 'overview', label: '知识总览', description: '跨模态知识资产与治理指标概览' },
  { key: 'text', label: '文本知识库', description: '文本入库、检索评估与治理策略' },
  { key: 'multimodal', label: '多模态知识库', description: '视频/音频/图像资产融合管理' },
  { key: 'graphrag', label: 'GraphRAG 编排', description: '图谱构建、推理链路与运行态' },
  { key: 'operations', label: '运营与治理', description: '质量缺陷、运营手册与告警' },
  { key: 'apis', label: 'API / SDK', description: '服务端接口与 Schema 定义' },
];

const numberFormatter = new Intl.NumberFormat('zh-CN');
const percentFormatter = new Intl.NumberFormat('zh-CN', { style: 'percent', maximumFractionDigits: 1 });

const formatDateTime = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false });

const getStatusClass = (status: KnowledgeSpace['status']) => {
  if (status === 'active') return styles.statusActive;
  if (status === 'syncing') return styles.statusSyncing;
  return styles.statusPaused;
};

const renderMetricCard = (metric: KnowledgeMetric) => (
  <div key={metric.key} className={styles.card}>
    <span className={styles.metricDelta}>{metric.delta}</span>
    <div className={styles.metricValue}>{`${numberFormatter.format(metric.value)}${metric.unit ?? ''}`}</div>
    <span>{metric.label}</span>
  </div>
);

const renderKnowledgeSpaceRow = (space: KnowledgeSpace) => (
  <tr key={space.id}>
    <td>
      <strong>{space.name}</strong>
      <div style={{ color: 'var(--kh-text-muted)', fontSize: 12 }}>{space.description}</div>
    </td>
    <td>{space.modality === 'text' ? '文本' : space.modality === 'graph' ? 'GraphRAG' : '多模态'}</td>
    <td>{numberFormatter.format(space.documentCount)}</td>
    <td>{numberFormatter.format(space.tokens)}</td>
    <td>{percentFormatter.format(space.recall)}</td>
    <td>{`${space.searchLatencyMs} ms`}</td>
    <td>
      <span className={`${styles.statusBadge} ${getStatusClass(space.status)}`}>
        {space.status === 'active' ? '在线' : space.status === 'syncing' ? '同步中' : '暂停'}
      </span>
    </td>
    <td>{space.owners.join(', ')}</td>
    <td>{formatDateTime(space.lastSync)}</td>
  </tr>
);

const renderPipelineStage = (pipeline: IngestionPipeline) => (
  <div key={pipeline.id} className={styles.card}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <div>
        <strong style={{ fontSize: 16 }}>{pipeline.name}</strong>
        <div style={{ fontSize: 12, color: 'var(--kh-text-muted)' }}>
          模态：{pipeline.modality === 'text' ? '文本' : pipeline.modality === 'graph' ? 'GraphRAG' : '多模态'} · 调度：
          {pipeline.schedule === 'realtime'
            ? '实时'
            : pipeline.schedule === 'hourly'
              ? '每小时'
              : pipeline.schedule === 'daily'
                ? '每日'
                : '手动'}
        </div>
      </div>
      <div className={styles.badge}>{`成功率 ${percentFormatter.format(pipeline.successRate)}`}</div>
    </div>
    <div className={styles.pipelineStageList}>
      {pipeline.stages.map((stage) => (
        <div key={stage.id} className={styles.pipelineStage}>
          <div>
            <strong>{stage.name}</strong>
            <div style={{ fontSize: 12, color: 'var(--kh-text-muted)' }}>{stage.description}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, color: 'var(--kh-text-muted)' }}>负责人：{stage.owner}</div>
            <div style={{ fontSize: 12, color: 'var(--kh-text-muted)' }}>状态：{stage.status}</div>
            {Object.keys(stage.config).length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--kh-text-muted)' }}>
                配置：{JSON.stringify(stage.config, null, 2)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
    <div style={{ fontSize: 12, color: 'var(--kh-text-muted)' }}>
      最近一次运行：{formatDateTime(pipeline.lastRunAt)} · 下次：{formatDateTime(pipeline.nextRunAt)}
    </div>
  </div>
);

const renderEvaluatorCard = (item: RetrievalEvaluator) => (
  <div key={item.id} className={styles.card}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <strong>{item.name}</strong>
      <span className={styles.badge}>{item.metric}</span>
    </div>
    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--kh-text-muted)' }}>当前</div>
        <div className={styles.metricValue}>
          {item.metric.includes('Recall') ? percentFormatter.format(item.current) : item.current}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--kh-text-muted)' }}>目标</div>
        <div style={{ fontSize: 16 }}>
          {item.metric.includes('Recall') ? percentFormatter.format(item.target) : item.target}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--kh-text-muted)' }}>基线</div>
        <div style={{ fontSize: 16 }}>
          {item.metric.includes('Recall') ? percentFormatter.format(item.baseline) : item.baseline}
        </div>
      </div>
    </div>
    <div style={{ fontSize: 12, color: 'var(--kh-text-muted)' }}>最近评估：{formatDateTime(item.lastRunAt)}</div>
  </div>
);

const renderAssetCard = (asset: MultimodalAsset) => (
  <div key={asset.id} className={styles.card}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <strong>{asset.title}</strong>
        <div style={{ fontSize: 12, color: 'var(--kh-text-muted)' }}>模态：{asset.modality.join(' / ')}</div>
      </div>
      <span className={styles.badge}>{asset.type.toUpperCase()}</span>
    </div>
    <div style={{ fontSize: 12, color: 'var(--kh-text-muted)' }}>向量维度：{asset.vectorSize}</div>
    <div style={{ fontSize: 12, color: 'var(--kh-text-muted)' }}>更新时间：{formatDateTime(asset.updatedAt)}</div>
    <div className={styles.tagList}>
      {asset.tags.map((tag) => (
        <span key={tag} className={styles.tag}>
          #{tag}
        </span>
      ))}
    </div>
  </div>
);

const renderGraphRun = (run: GraphRagRun) => (
  <div key={run.id} className={styles.timelineItem}>
    <strong>{run.query}</strong>
    <span>
      触发人：{run.triggeredBy} · 状态：{run.status}
    </span>
    <span>
      延迟：{run.latencyMs}ms · Hops：{run.hops} · 推理 Tokens：{numberFormatter.format(run.reasoningTokens)}
    </span>
    <span>时间：{formatDateTime(run.createdAt)}</span>
  </div>
);

const renderQualityIssue = (issue: DataQualityIssue) => (
  <div key={issue.id} className={styles.timelineItem}>
    <strong>
      {issue.title}{' '}
      <span
        className={
          issue.severity === 'high'
            ? styles.severityHigh
            : issue.severity === 'medium'
              ? styles.severityMedium
              : styles.severityLow
        }
      >
        · {issue.severity.toUpperCase()}
      </span>
    </strong>
    <span>{issue.description}</span>
    <span>责任人：{issue.owner}</span>
    <span>检测时间：{formatDateTime(issue.detectedAt)}</span>
    <span>建议方案：{issue.remediation}</span>
  </div>
);

const renderPlaybook = (playbook: WorkflowPlaybook) => (
  <div key={playbook.id} className={styles.card}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <strong>{playbook.name}</strong>
      <span className={styles.badge}>{playbook.category}</span>
    </div>
    <div style={{ fontSize: 12, color: 'var(--kh-text-muted)' }}>Owner：{playbook.owner}</div>
    <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {playbook.steps.map((step, index) => (
        <li key={step} style={{ fontSize: 13, color: 'var(--kh-text)' }}>
          {index + 1}. {step}
        </li>
      ))}
    </ol>
  </div>
);

const renderBackendService = (service: BackendService) => (
  <div key={service.name} className={styles.card}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <strong>{service.name}</strong>
        <div style={{ fontSize: 12, color: 'var(--kh-text-muted)' }}>{service.description}</div>
      </div>
      <span className={styles.badge}>{service.basePath}</span>
    </div>
    <div className={styles.apiGrid}>
      {service.endpoints.map((endpoint) => (
        <div key={endpoint.id} className={styles.apiEndpoint}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className={styles.badge}>{endpoint.method}</span>
            <strong>{endpoint.path}</strong>
          </div>
          <span style={{ fontSize: 12, color: 'var(--kh-text-muted)' }}>{endpoint.summary}</span>
          <span style={{ fontSize: 12, color: 'var(--kh-text-muted)' }}>{endpoint.description}</span>
          {endpoint.queryParams && endpoint.queryParams.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--kh-text-muted)', marginBottom: 4 }}>Query</div>
              <div className={styles.codeBlock}>{JSON.stringify(endpoint.queryParams, null, 2)}</div>
            </div>
          )}
          {endpoint.requestBody && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--kh-text-muted)', marginBottom: 4 }}>Request Body</div>
              <div className={styles.codeBlock}>{JSON.stringify(endpoint.requestBody, null, 2)}</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 12, color: 'var(--kh-text-muted)', marginBottom: 4 }}>Response</div>
            <div className={styles.codeBlock}>{JSON.stringify(endpoint.responseBody, null, 2)}</div>
          </div>
          {endpoint.errors && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--kh-text-muted)', marginBottom: 4 }}>Errors</div>
              <div className={styles.codeBlock}>{JSON.stringify(endpoint.errors, null, 2)}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

const App = (_props: AppProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const activeTabConfig = useMemo(() => TAB_CONFIG.find((tab) => tab.key === activeTab), [activeTab]);

  return (
    <div className={styles.appShell}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>Knowledge Hub</h1>
          <span>{activeTabConfig?.description ?? '知识中台微应用'}</span>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryButton} type="button">
            版本切换
          </button>
          <button className={styles.primaryButton} type="button">
            新建知识空间
          </button>
        </div>
      </header>

      <nav className={styles.tabBar}>
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tabButton} ${activeTab === tab.key ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className={styles.content}>
        {activeTab === 'overview' && (
          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h2>跨模态知识运行态</h2>
              <span>实时了解知识资产规模、模态分布与检索质量</span>
            </header>
            <div className={styles.grid}>{knowledgeMetrics.map(renderMetricCard)}</div>
            <div className={styles.section} style={{ marginTop: 8 }}>
              <header className={styles.sectionHeader}>
                <h2>知识空间</h2>
                <span>统一管理文本、多模态与 GraphRAG 空间</span>
              </header>
              <div style={{ overflowX: 'auto' }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>空间</th>
                      <th>模态</th>
                      <th>文档数</th>
                      <th>Tokens</th>
                      <th>Recall@10</th>
                      <th>P95 延迟</th>
                      <th>状态</th>
                      <th>Owner</th>
                      <th>最近同步</th>
                    </tr>
                  </thead>
                  <tbody>{knowledgeSpaces.map(renderKnowledgeSpaceRow)}</tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'text' && (
          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h2>文本知识库作业面板</h2>
              <span>自适应切片、嵌入、索引与检索评估</span>
            </header>
            <div className={styles.twoColumn}>
              {ingestionPipelines.filter((item) => item.modality === 'text').map(renderPipelineStage)}
            </div>
            <div className={styles.section}>
              <header className={styles.sectionHeader}>
                <h2>检索质量评估</h2>
                <span>持续跟踪召回、延迟与覆盖率指标</span>
              </header>
              <div className={styles.twoColumn}>{retrievalEvaluators.map(renderEvaluatorCard)}</div>
            </div>
          </section>
        )}

        {activeTab === 'multimodal' && (
          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h2>多模态知识资产</h2>
              <span>统一管理视频、音频、图像与结构化文本</span>
            </header>
            <div className={styles.twoColumn}>
              {ingestionPipelines.filter((item) => item.modality === 'multimodal').map(renderPipelineStage)}
            </div>
            <div className={styles.section}>
              <header className={styles.sectionHeader}>
                <h2>资产工作台</h2>
                <span>多模态资产向量化、标签体系与治理状态</span>
              </header>
              <div className={styles.twoColumn}>{multimodalAssets.map(renderAssetCard)}</div>
            </div>
          </section>
        )}

        {activeTab === 'graphrag' && (
          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h2>GraphRAG 编排中心</h2>
              <span>图谱构建、推理链与运行态分析</span>
            </header>
            <div className={styles.twoColumn}>
              {ingestionPipelines.filter((item) => item.modality === 'graph').map(renderPipelineStage)}
            </div>
            <div className={styles.section}>
              <header className={styles.sectionHeader}>
                <h2>节点与关系模板</h2>
                <span>统一定义图谱节点类型与关系语义</span>
              </header>
              <div className={styles.twoColumn}>
                <div className={styles.card}>
                  <strong>节点类型（Node Types）</strong>
                  <div className={styles.timeline}>
                    {graphNodeTypes.map((node) => (
                      <div key={node.id} className={styles.timelineItem}>
                        <strong>{node.label}</strong>
                        <span>{node.description}</span>
                        <span>示例：{node.example}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={styles.card}>
                  <strong>关系类型（Edge Types）</strong>
                  <div className={styles.timeline}>
                    {graphRelationshipTypes.map((relationship) => (
                      <div key={relationship.id} className={styles.timelineItem}>
                        <strong>{relationship.label}</strong>
                        <span>
                          {relationship.source} → {relationship.target}
                        </span>
                        <span>{relationship.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.section}>
              <header className={styles.sectionHeader}>
                <h2>推理运行态</h2>
                <span>最近 GraphRAG 推理任务与性能指标</span>
              </header>
              <div className={styles.timeline}>{graphRagRuns.map(renderGraphRun)}</div>
            </div>
          </section>
        )}

        {activeTab === 'operations' && (
          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h2>知识运营与治理</h2>
              <span>面向 SRE/治理团队的一站式质量追踪</span>
            </header>
            <div className={styles.section}>
              <header className={styles.sectionHeader}>
                <h2>实时缺陷</h2>
                <span>自动同步缺陷清单并提供修复建议</span>
              </header>
              <div className={styles.timeline}>{dataQualityIssues.map(renderQualityIssue)}</div>
            </div>
            <div className={styles.section}>
              <header className={styles.sectionHeader}>
                <h2>标准化手册</h2>
                <span>关键运营场景的 SOP 与排障指南</span>
              </header>
              <div className={styles.twoColumn}>{workflowPlaybooks.map(renderPlaybook)}</div>
            </div>
          </section>
        )}

        {activeTab === 'apis' && (
          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h2>服务端 API 与 Schema</h2>
              <span>对接后端服务时可直接复用的接口定义</span>
            </header>
            <div className={styles.grid}>{backendServices.map(renderBackendService)}</div>
          </section>
        )}
      </main>
    </div>
  );
};

export default App;
