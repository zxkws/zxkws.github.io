export const StatusBar = ({
  saving,
  loading,
}: {
  saving: 'idle' | 'local' | 'syncing' | 'error';
  loading: boolean;
}) => {
  const text = {
    idle: '已同步',
    local: '已保存本地，正在同步…',
    syncing: '正在同步…',
    error: '同步失败，请重试',
  }[saving];

  return (
    <div className="status-bar">
      <span>{loading ? '加载中…' : text}</span>
    </div>
  );
};
