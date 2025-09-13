import express from "express";

const app = express();

app.use((req, res) => {
  console.log(req);
  res.end("200");
});

app.listen(3333, () => {});
