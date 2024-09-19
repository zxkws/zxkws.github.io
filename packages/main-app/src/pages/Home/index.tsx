import { Link } from 'ice';
import React from 'react';

const Home = () => {
  return (
    <React.Fragment>
      <h1>home page</h1>
      <div><Link to="/about">About</Link></div>
      <div><Link to="/v3">进入vue微应用</Link></div>
      <div><Link to="/rc">进入react微应用</Link></div>
    </React.Fragment>
  );
};

export default Home;
