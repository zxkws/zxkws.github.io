export default (props) => {
  const { children, loading = false } = props;
  return (
    <div id="child-container" style={{ alignContent: 'center' }} className="flex flex-1 text-center">
      {loading ? 'loading...' : children}
    </div>
  );
};
