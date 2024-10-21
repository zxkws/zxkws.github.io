const BASEURL =
  process.env.NODE_ENV === "development"
    ? "https://3000-zxkws-monorepoadmin-qgp9qaiie1l.ws-us116.gitpod.io/api"
    : "https://api.zxkws.nyc.mn/api";

export default (url, params) => {
  return fetch(BASEURL + url, {
    method: "POST",
    body: JSON.stringify(params),
    headers: {
      "Content-Type": "application/json",
      "Access-Token": localStorage.getItem("Access-Token"),
    },
  })
    .then((res) => res.json())
    .then((res) => {
      return res;
    });
};
