import { Link } from 'ice';
import React from 'react';

const Home = () => {
  return (
    <React.Fragment>
      <h1>home page</h1>
      <div><Link to="/about">About</Link></div>
      <div><Link to="/v3">进入vue微应用</Link></div>
      <div><Link to="/rc">进入react微应用</Link></div>
      <a href="./person-collect/index.html" target="_blank">mine</a>
    <a href="https://gist.github.com/imba-tjd/d73258f0817255dbe77d64d40d985e76" target="_blank">free</a>
    <div>1</div>
    <div>2</div>
    <div>3</div>
    <div><a href="https://w3techs.com/" target="_blank">tech排行</a></div>
    <div>
        <a href="https://gitpod.io#https://github.com/zxkws/zxkws.github.io" target="_blank">开发本项目</a>
    </div>
    <div>3ee231aa-0d14-42ec-8363-0dc900923542</div>
    <code>docker run -d -p 8080:80 -e HTTP_PASSWORD=xxxxx dorowu/ubuntu-desktop-lxde-vnc --name my-desktop</code>
    <div>
        使用chatgpt的步骤
        打开<a href="http://new.oaifree.com/" target="_blank">用自己的gpt账号登陆</a>
        <div style={{display: 'none'}}>https://101.32.47.208/</div>
    </div>
    </React.Fragment>
  );
};

export default Home;
