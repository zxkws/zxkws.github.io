export default (props) => {
  const { children, loading = false } = props;
  return (
    <div id="child-container" style={{ display: 'flex', flex: 1, textAlign: 'center', alignContent: 'center' }}>
      {loading ? 'loading...' : children}
    </div>
  );
};
