const fs = require('fs');
const path = require('path');
const distDir = path.join(__dirname, 'dist', 'resume');
fs.mkdirSync(distDir, { recursive: true });
const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0;url=https://zxkws.nyc.mn/person-resume-app/" />
    <title>Redirecting...</title>
  </head>
  <body>
    <p>Redirecting to resume... <a href="https://zxkws.nyc.mn/person-resume-app/">点击这里</a></p>
  </body>
</html>`;
fs.writeFileSync(path.join(distDir, 'index.html'), html);
