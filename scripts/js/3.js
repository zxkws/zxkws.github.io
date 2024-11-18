const url = "https://unpkg.com/@surely-vue/table@4.3.13/dist/index.umd.js";

fetch(url)
  .then((res) => res.text())
  .then((res) => {
    globalThis.arr = [];
    let count = Math.floor(res.length / 15000),
      i = 0;
    while (i < count) {
      arr.push(res.slice(i * 15000, 15000 * (i + 1)));
      i++;
    }
  })
  .then(() => {
    console.log(arr.length);
  });
