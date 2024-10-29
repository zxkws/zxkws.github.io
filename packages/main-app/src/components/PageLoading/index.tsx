export default (props) => {
  const { children, loading = false } = props;
  return (
    <div style={{ flex: 1, textAlign: 'center', alignContent: 'center' }}>{loading ? 'loading...' : children}</div>
  );
};
