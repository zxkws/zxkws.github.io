import{d as f,r,o as v,a as l,c as d,b as a,F as c,e as _,u,w as k,v as x,i as T,f as b,t as y}from"./main-TRrBBcOs.js";import{q as g,m as h,d as C}from"./index-CEH1BsoV.js";const q=["onClick"],D=f({__name:"index",setup(B){const o=r(""),i=r([{id:1,description:"学习"}]);v(()=>{n()});const n=()=>{g({}).then(e=>{e&&e.data&&e.data.todos&&(i.value=e.data.todos)})},m=()=>{h({description:o.value}).then(e=>{console.log(e),o.value="",n()})},p=e=>{C({id:e}).then(s=>{console.log(s),n()})};return(e,s)=>(l(),d(c,null,[a("ul",null,[(l(!0),d(c,null,_(u(i),t=>(l(),d("li",{key:t.id},[b(y(t.description)+" ",1),a("button",{class:"border",onClick:()=>p(t.id)},"delete",8,q)]))),128))]),a("div",null,[k(a("textarea",{class:"text-black","onUpdate:modelValue":s[0]||(s[0]=t=>T(o)?o.value=t:null)},null,512),[[x,u(o)]]),a("button",{onClick:m},"添加todo")])],64))}});export{D as default};
