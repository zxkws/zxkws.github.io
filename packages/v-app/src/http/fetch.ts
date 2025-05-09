const BASEURL =
  process.env.NODE_ENV === "development"
    ? "/api"
    : "https://api.zxkws.nyc.mn/api";

let token = "";

import router from "../router";

export default (url, params, options = {}) => {
  let body;
  if (options.file) {
    body = params;
  } else {
    body = JSON.stringify(params);
  }
  return fetch(BASEURL + url, {
    method: "POST",
    credentials: "include",
    body,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? "Bearer " + token : "",
    },
  })
    .then((res) => {
      token = res.headers.get("Token") || token;
      localStorage.setItem('auth_token',token);
      const contentType = res.headers.get("Content-Type");
      if (contentType?.includes("application/json")) {
        return res.json();
      }
      return res.text();
    })
    .then((res) => {
      if (res.statusCode === 401) {
        router.push({ name: "login" });
      }
      return res;
    })
    .catch((err) => {
      alert(err);
    });
};
