import{d as p,k as c,f as g,o as a,c as n,a as e,F as m,r as x,u,w as y,v as h,l as _,t as v}from"./main-DE0-nnOr.js";import{q as w,m as k,d as T}from"./index-DS_NToXW.js";import{m as C}from"./index-D8j8bJG6.js";const L={class:"flex flex-col h-screen mx-auto p-6 bg-white shadow-lg rounded-lg"},q={class:"flex-1 overflow-y-auto space-y-4 p-4"},B={class:"flex-1 text-gray-700 break-words"},D=["onClick"],F={class:"flex items-center p-4 border-t border-gray-200 bg-white sticky bottom-0"},z=p({__name:"index",setup(M){const d=C(),o=c(""),i=c([]);g(()=>{l()});const l=()=>{d.setLoading(!0,"查询todo...."),w({}).then(r=>{i.value=r}).finally(()=>{d.setLoading(!1)})},b=()=>{k({description:o.value}).then(()=>{o.value="",l()})},f=r=>{T({id:r}).then(t=>{l()})};return(r,t)=>(a(),n("div",L,[t[1]||(t[1]=e("h2",{class:"text-xl font-semibold p-4 border-b border-gray-200"}," Todo List ",-1)),e("ul",q,[(a(!0),n(m,null,x(u(i),s=>(a(),n("li",{key:s._id,class:"flex items-start justify-between p-4 bg-gray-100 border border-gray-300 rounded-lg"},[e("p",B,v(s.description),1),e("button",{class:"ml-4 px-3 py-1 text-white bg-red-500 rounded-lg hover:bg-red-600",onClick:()=>f(s._id)}," delete ",8,D)]))),128))]),e("div",F,[y(e("textarea",{class:"flex-1 resize-none p-2 text-black border border-gray-300 rounded-lg mr-2 focus:outline-none focus:ring-2 focus:ring-blue-400",rows:"1",placeholder:"输入新的 Todo...","onUpdate:modelValue":t[0]||(t[0]=s=>_(o)?o.value=s:null)},null,512),[[h,u(o)]]),e("button",{onClick:b,class:"px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600"}," 添加 ")])]))}});export{z as default};
