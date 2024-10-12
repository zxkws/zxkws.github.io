(()=>{var t={189:t=>{var e=function(){this.Diff_Timeout=1,this.Diff_EditCost=4,this.Match_Threshold=.5,this.Match_Distance=1e3,this.Patch_DeleteThreshold=.5,this.Patch_Margin=4,this.Match_MaxBits=32},n=-1;e.Diff=function(t,e){return[t,e]},e.prototype.diff_main=function(t,n,i,r){void 0===r&&(r=this.Diff_Timeout<=0?Number.MAX_VALUE:(new Date).getTime()+1e3*this.Diff_Timeout);var h=r;if(null==t||null==n)throw new Error("Null input. (diff_main)");if(t==n)return t?[new e.Diff(0,t)]:[];void 0===i&&(i=!0);var s=i,f=this.diff_commonPrefix(t,n),a=t.substring(0,f);t=t.substring(f),n=n.substring(f),f=this.diff_commonSuffix(t,n);var l=t.substring(t.length-f);t=t.substring(0,t.length-f),n=n.substring(0,n.length-f);var g=this.diff_compute_(t,n,s,h);return a&&g.unshift(new e.Diff(0,a)),l&&g.push(new e.Diff(0,l)),this.diff_cleanupMerge(g),g},e.prototype.diff_compute_=function(t,i,r,h){var s;if(!t)return[new e.Diff(1,i)];if(!i)return[new e.Diff(n,t)];var f=t.length>i.length?t:i,a=t.length>i.length?i:t,l=f.indexOf(a);if(-1!=l)return s=[new e.Diff(1,f.substring(0,l)),new e.Diff(0,a),new e.Diff(1,f.substring(l+a.length))],t.length>i.length&&(s[0][0]=s[2][0]=n),s;if(1==a.length)return[new e.Diff(n,t),new e.Diff(1,i)];var g=this.diff_halfMatch_(t,i);if(g){var o=g[0],c=g[1],u=g[2],p=g[3],d=g[4],_=this.diff_main(o,u,r,h),b=this.diff_main(c,p,r,h);return _.concat([new e.Diff(0,d)],b)}return r&&t.length>100&&i.length>100?this.diff_lineMode_(t,i,h):this.diff_bisect_(t,i,h)},e.prototype.diff_lineMode_=function(t,i,r){var h=this.diff_linesToChars_(t,i);t=h.chars1,i=h.chars2;var s=h.lineArray,f=this.diff_main(t,i,!1,r);this.diff_charsToLines_(f,s),this.diff_cleanupSemantic(f),f.push(new e.Diff(0,""));for(var a=0,l=0,g=0,o="",c="";a<f.length;){switch(f[a][0]){case 1:g++,c+=f[a][1];break;case n:l++,o+=f[a][1];break;case 0:if(l>=1&&g>=1){f.splice(a-l-g,l+g),a=a-l-g;for(var u=this.diff_main(o,c,!1,r),p=u.length-1;p>=0;p--)f.splice(a,0,u[p]);a+=u.length}g=0,l=0,o="",c=""}a++}return f.pop(),f},e.prototype.diff_bisect_=function(t,i,r){for(var h=t.length,s=i.length,f=Math.ceil((h+s)/2),a=f,l=2*f,g=new Array(l),o=new Array(l),c=0;c<l;c++)g[c]=-1,o[c]=-1;g[a+1]=0,o[a+1]=0;for(var u=h-s,p=u%2!=0,d=0,_=0,b=0,v=0,m=0;m<f&&!((new Date).getTime()>r);m++){for(var w=-m+d;w<=m-_;w+=2){for(var x=a+w,M=(E=w==-m||w!=m&&g[x-1]<g[x+1]?g[x+1]:g[x-1]+1)-w;E<h&&M<s&&t.charAt(E)==i.charAt(M);)E++,M++;if(g[x]=E,E>h)_+=2;else if(M>s)d+=2;else if(p&&(A=a+u-w)>=0&&A<l&&-1!=o[A]&&E>=(D=h-o[A]))return this.diff_bisectSplit_(t,i,E,M,r)}for(var y=-m+b;y<=m-v;y+=2){for(var D,A=a+y,k=(D=y==-m||y!=m&&o[A-1]<o[A+1]?o[A+1]:o[A-1]+1)-y;D<h&&k<s&&t.charAt(h-D-1)==i.charAt(s-k-1);)D++,k++;if(o[A]=D,D>h)v+=2;else if(k>s)b+=2;else if(!p){var E;if((x=a+u-y)>=0&&x<l&&-1!=g[x])if(M=a+(E=g[x])-x,E>=(D=h-D))return this.diff_bisectSplit_(t,i,E,M,r)}}}return[new e.Diff(n,t),new e.Diff(1,i)]},e.prototype.diff_bisectSplit_=function(t,e,n,i,r){var h=t.substring(0,n),s=e.substring(0,i),f=t.substring(n),a=e.substring(i),l=this.diff_main(h,s,!1,r),g=this.diff_main(f,a,!1,r);return l.concat(g)},e.prototype.diff_linesToChars_=function(t,e){var n=[],i={};function r(t){for(var e="",r=0,s=-1,f=n.length;s<t.length-1;){-1==(s=t.indexOf("\n",r))&&(s=t.length-1);var a=t.substring(r,s+1);(i.hasOwnProperty?i.hasOwnProperty(a):void 0!==i[a])?e+=String.fromCharCode(i[a]):(f==h&&(a=t.substring(r),s=t.length),e+=String.fromCharCode(f),i[a]=f,n[f++]=a),r=s+1}return e}n[0]="";var h=4e4,s=r(t);return h=65535,{chars1:s,chars2:r(e),lineArray:n}},e.prototype.diff_charsToLines_=function(t,e){for(var n=0;n<t.length;n++){for(var i=t[n][1],r=[],h=0;h<i.length;h++)r[h]=e[i.charCodeAt(h)];t[n][1]=r.join("")}},e.prototype.diff_commonPrefix=function(t,e){if(!t||!e||t.charAt(0)!=e.charAt(0))return 0;for(var n=0,i=Math.min(t.length,e.length),r=i,h=0;n<r;)t.substring(h,r)==e.substring(h,r)?h=n=r:i=r,r=Math.floor((i-n)/2+n);return r},e.prototype.diff_commonSuffix=function(t,e){if(!t||!e||t.charAt(t.length-1)!=e.charAt(e.length-1))return 0;for(var n=0,i=Math.min(t.length,e.length),r=i,h=0;n<r;)t.substring(t.length-r,t.length-h)==e.substring(e.length-r,e.length-h)?h=n=r:i=r,r=Math.floor((i-n)/2+n);return r},e.prototype.diff_commonOverlap_=function(t,e){var n=t.length,i=e.length;if(0==n||0==i)return 0;n>i?t=t.substring(n-i):n<i&&(e=e.substring(0,n));var r=Math.min(n,i);if(t==e)return r;for(var h=0,s=1;;){var f=t.substring(r-s),a=e.indexOf(f);if(-1==a)return h;s+=a,0!=a&&t.substring(r-s)!=e.substring(0,s)||(h=s,s++)}},e.prototype.diff_halfMatch_=function(t,e){if(this.Diff_Timeout<=0)return null;var n=t.length>e.length?t:e,i=t.length>e.length?e:t;if(n.length<4||2*i.length<n.length)return null;var r=this;function h(t,e,n){for(var i,h,s,f,a=t.substring(n,n+Math.floor(t.length/4)),l=-1,g="";-1!=(l=e.indexOf(a,l+1));){var o=r.diff_commonPrefix(t.substring(n),e.substring(l)),c=r.diff_commonSuffix(t.substring(0,n),e.substring(0,l));g.length<c+o&&(g=e.substring(l-c,l)+e.substring(l,l+o),i=t.substring(0,n-c),h=t.substring(n+o),s=e.substring(0,l-c),f=e.substring(l+o))}return 2*g.length>=t.length?[i,h,s,f,g]:null}var s,f,a,l,g,o=h(n,i,Math.ceil(n.length/4)),c=h(n,i,Math.ceil(n.length/2));return o||c?(s=c?o&&o[4].length>c[4].length?o:c:o,t.length>e.length?(f=s[0],a=s[1],l=s[2],g=s[3]):(l=s[0],g=s[1],f=s[2],a=s[3]),[f,a,l,g,s[4]]):null},e.prototype.diff_cleanupSemantic=function(t){for(var i=!1,r=[],h=0,s=null,f=0,a=0,l=0,g=0,o=0;f<t.length;)0==t[f][0]?(r[h++]=f,a=g,l=o,g=0,o=0,s=t[f][1]):(1==t[f][0]?g+=t[f][1].length:o+=t[f][1].length,s&&s.length<=Math.max(a,l)&&s.length<=Math.max(g,o)&&(t.splice(r[h-1],0,new e.Diff(n,s)),t[r[h-1]+1][0]=1,h--,f=--h>0?r[h-1]:-1,a=0,l=0,g=0,o=0,s=null,i=!0)),f++;for(i&&this.diff_cleanupMerge(t),this.diff_cleanupSemanticLossless(t),f=1;f<t.length;){if(t[f-1][0]==n&&1==t[f][0]){var c=t[f-1][1],u=t[f][1],p=this.diff_commonOverlap_(c,u),d=this.diff_commonOverlap_(u,c);p>=d?(p>=c.length/2||p>=u.length/2)&&(t.splice(f,0,new e.Diff(0,u.substring(0,p))),t[f-1][1]=c.substring(0,c.length-p),t[f+1][1]=u.substring(p),f++):(d>=c.length/2||d>=u.length/2)&&(t.splice(f,0,new e.Diff(0,c.substring(0,d))),t[f-1][0]=1,t[f-1][1]=u.substring(0,u.length-d),t[f+1][0]=n,t[f+1][1]=c.substring(d),f++),f++}f++}},e.prototype.diff_cleanupSemanticLossless=function(t){function n(t,n){if(!t||!n)return 6;var i=t.charAt(t.length-1),r=n.charAt(0),h=i.match(e.nonAlphaNumericRegex_),s=r.match(e.nonAlphaNumericRegex_),f=h&&i.match(e.whitespaceRegex_),a=s&&r.match(e.whitespaceRegex_),l=f&&i.match(e.linebreakRegex_),g=a&&r.match(e.linebreakRegex_),o=l&&t.match(e.blanklineEndRegex_),c=g&&n.match(e.blanklineStartRegex_);return o||c?5:l||g?4:h&&!f&&a?3:f||a?2:h||s?1:0}for(var i=1;i<t.length-1;){if(0==t[i-1][0]&&0==t[i+1][0]){var r=t[i-1][1],h=t[i][1],s=t[i+1][1],f=this.diff_commonSuffix(r,h);if(f){var a=h.substring(h.length-f);r=r.substring(0,r.length-f),h=a+h.substring(0,h.length-f),s=a+s}for(var l=r,g=h,o=s,c=n(r,h)+n(h,s);h.charAt(0)===s.charAt(0);){r+=h.charAt(0),h=h.substring(1)+s.charAt(0),s=s.substring(1);var u=n(r,h)+n(h,s);u>=c&&(c=u,l=r,g=h,o=s)}t[i-1][1]!=l&&(l?t[i-1][1]=l:(t.splice(i-1,1),i--),t[i][1]=g,o?t[i+1][1]=o:(t.splice(i+1,1),i--))}i++}},e.nonAlphaNumericRegex_=/[^a-zA-Z0-9]/,e.whitespaceRegex_=/\s/,e.linebreakRegex_=/[\r\n]/,e.blanklineEndRegex_=/\n\r?\n$/,e.blanklineStartRegex_=/^\r?\n\r?\n/,e.prototype.diff_cleanupEfficiency=function(t){for(var i=!1,r=[],h=0,s=null,f=0,a=!1,l=!1,g=!1,o=!1;f<t.length;)0==t[f][0]?(t[f][1].length<this.Diff_EditCost&&(g||o)?(r[h++]=f,a=g,l=o,s=t[f][1]):(h=0,s=null),g=o=!1):(t[f][0]==n?o=!0:g=!0,s&&(a&&l&&g&&o||s.length<this.Diff_EditCost/2&&a+l+g+o==3)&&(t.splice(r[h-1],0,new e.Diff(n,s)),t[r[h-1]+1][0]=1,h--,s=null,a&&l?(g=o=!0,h=0):(f=--h>0?r[h-1]:-1,g=o=!1),i=!0)),f++;i&&this.diff_cleanupMerge(t)},e.prototype.diff_cleanupMerge=function(t){t.push(new e.Diff(0,""));for(var i,r=0,h=0,s=0,f="",a="";r<t.length;)switch(t[r][0]){case 1:s++,a+=t[r][1],r++;break;case n:h++,f+=t[r][1],r++;break;case 0:h+s>1?(0!==h&&0!==s&&(0!==(i=this.diff_commonPrefix(a,f))&&(r-h-s>0&&0==t[r-h-s-1][0]?t[r-h-s-1][1]+=a.substring(0,i):(t.splice(0,0,new e.Diff(0,a.substring(0,i))),r++),a=a.substring(i),f=f.substring(i)),0!==(i=this.diff_commonSuffix(a,f))&&(t[r][1]=a.substring(a.length-i)+t[r][1],a=a.substring(0,a.length-i),f=f.substring(0,f.length-i))),r-=h+s,t.splice(r,h+s),f.length&&(t.splice(r,0,new e.Diff(n,f)),r++),a.length&&(t.splice(r,0,new e.Diff(1,a)),r++),r++):0!==r&&0==t[r-1][0]?(t[r-1][1]+=t[r][1],t.splice(r,1)):r++,s=0,h=0,f="",a=""}""===t[t.length-1][1]&&t.pop();var l=!1;for(r=1;r<t.length-1;)0==t[r-1][0]&&0==t[r+1][0]&&(t[r][1].substring(t[r][1].length-t[r-1][1].length)==t[r-1][1]?(t[r][1]=t[r-1][1]+t[r][1].substring(0,t[r][1].length-t[r-1][1].length),t[r+1][1]=t[r-1][1]+t[r+1][1],t.splice(r-1,1),l=!0):t[r][1].substring(0,t[r+1][1].length)==t[r+1][1]&&(t[r-1][1]+=t[r+1][1],t[r][1]=t[r][1].substring(t[r+1][1].length)+t[r+1][1],t.splice(r+1,1),l=!0)),r++;l&&this.diff_cleanupMerge(t)},e.prototype.diff_xIndex=function(t,e){var i,r=0,h=0,s=0,f=0;for(i=0;i<t.length&&(1!==t[i][0]&&(r+=t[i][1].length),t[i][0]!==n&&(h+=t[i][1].length),!(r>e));i++)s=r,f=h;return t.length!=i&&t[i][0]===n?f:f+(e-s)},e.prototype.diff_prettyHtml=function(t){for(var e=[],i=/&/g,r=/</g,h=/>/g,s=/\n/g,f=0;f<t.length;f++){var a=t[f][0],l=t[f][1].replace(i,"&amp;").replace(r,"&lt;").replace(h,"&gt;").replace(s,"&para;<br>");switch(a){case 1:e[f]='<ins style="background:#e6ffe6;">'+l+"</ins>";break;case n:e[f]='<del style="background:#ffe6e6;">'+l+"</del>";break;case 0:e[f]="<span>"+l+"</span>"}}return e.join("")},e.prototype.diff_text1=function(t){for(var e=[],n=0;n<t.length;n++)1!==t[n][0]&&(e[n]=t[n][1]);return e.join("")},e.prototype.diff_text2=function(t){for(var e=[],i=0;i<t.length;i++)t[i][0]!==n&&(e[i]=t[i][1]);return e.join("")},e.prototype.diff_levenshtein=function(t){for(var e=0,i=0,r=0,h=0;h<t.length;h++){var s=t[h][0],f=t[h][1];switch(s){case 1:i+=f.length;break;case n:r+=f.length;break;case 0:e+=Math.max(i,r),i=0,r=0}}return e+Math.max(i,r)},e.prototype.diff_toDelta=function(t){for(var e=[],i=0;i<t.length;i++)switch(t[i][0]){case 1:e[i]="+"+encodeURI(t[i][1]);break;case n:e[i]="-"+t[i][1].length;break;case 0:e[i]="="+t[i][1].length}return e.join("\t").replace(/%20/g," ")},e.prototype.diff_fromDelta=function(t,i){for(var r=[],h=0,s=0,f=i.split(/\t/g),a=0;a<f.length;a++){var l=f[a].substring(1);switch(f[a].charAt(0)){case"+":try{r[h++]=new e.Diff(1,decodeURI(l))}catch(t){throw new Error("Illegal escape in diff_fromDelta: "+l)}break;case"-":case"=":var g=parseInt(l,10);if(isNaN(g)||g<0)throw new Error("Invalid number in diff_fromDelta: "+l);var o=t.substring(s,s+=g);"="==f[a].charAt(0)?r[h++]=new e.Diff(0,o):r[h++]=new e.Diff(n,o);break;default:if(f[a])throw new Error("Invalid diff operation in diff_fromDelta: "+f[a])}}if(s!=t.length)throw new Error("Delta length ("+s+") does not equal source text length ("+t.length+").");return r},e.prototype.match_main=function(t,e,n){if(null==t||null==e||null==n)throw new Error("Null input. (match_main)");return n=Math.max(0,Math.min(n,t.length)),t==e?0:t.length?t.substring(n,n+e.length)==e?n:this.match_bitap_(t,e,n):-1},e.prototype.match_bitap_=function(t,e,n){if(e.length>this.Match_MaxBits)throw new Error("Pattern too long for this browser.");var i=this.match_alphabet_(e),r=this;function h(t,i){var h=t/e.length,s=Math.abs(n-i);return r.Match_Distance?h+s/r.Match_Distance:s?1:h}var s=this.Match_Threshold,f=t.indexOf(e,n);-1!=f&&(s=Math.min(h(0,f),s),-1!=(f=t.lastIndexOf(e,n+e.length))&&(s=Math.min(h(0,f),s)));var a,l,g=1<<e.length-1;f=-1;for(var o,c=e.length+t.length,u=0;u<e.length;u++){for(a=0,l=c;a<l;)h(u,n+l)<=s?a=l:c=l,l=Math.floor((c-a)/2+a);c=l;var p=Math.max(1,n-l+1),d=Math.min(n+l,t.length)+e.length,_=Array(d+2);_[d+1]=(1<<u)-1;for(var b=d;b>=p;b--){var v=i[t.charAt(b-1)];if(_[b]=0===u?(_[b+1]<<1|1)&v:(_[b+1]<<1|1)&v|(o[b+1]|o[b])<<1|1|o[b+1],_[b]&g){var m=h(u,b-1);if(m<=s){if(s=m,!((f=b-1)>n))break;p=Math.max(1,2*n-f)}}}if(h(u+1,n)>s)break;o=_}return f},e.prototype.match_alphabet_=function(t){for(var e={},n=0;n<t.length;n++)e[t.charAt(n)]=0;for(n=0;n<t.length;n++)e[t.charAt(n)]|=1<<t.length-n-1;return e},e.prototype.patch_addContext_=function(t,n){if(0!=n.length){if(null===t.start2)throw Error("patch not initialized");for(var i=n.substring(t.start2,t.start2+t.length1),r=0;n.indexOf(i)!=n.lastIndexOf(i)&&i.length<this.Match_MaxBits-this.Patch_Margin-this.Patch_Margin;)r+=this.Patch_Margin,i=n.substring(t.start2-r,t.start2+t.length1+r);r+=this.Patch_Margin;var h=n.substring(t.start2-r,t.start2);h&&t.diffs.unshift(new e.Diff(0,h));var s=n.substring(t.start2+t.length1,t.start2+t.length1+r);s&&t.diffs.push(new e.Diff(0,s)),t.start1-=h.length,t.start2-=h.length,t.length1+=h.length+s.length,t.length2+=h.length+s.length}},e.prototype.patch_make=function(t,i,r){var h,s;if("string"==typeof t&&"string"==typeof i&&void 0===r)h=t,(s=this.diff_main(h,i,!0)).length>2&&(this.diff_cleanupSemantic(s),this.diff_cleanupEfficiency(s));else if(t&&"object"==typeof t&&void 0===i&&void 0===r)s=t,h=this.diff_text1(s);else if("string"==typeof t&&i&&"object"==typeof i&&void 0===r)h=t,s=i;else{if("string"!=typeof t||"string"!=typeof i||!r||"object"!=typeof r)throw new Error("Unknown call format to patch_make.");h=t,s=r}if(0===s.length)return[];for(var f=[],a=new e.patch_obj,l=0,g=0,o=0,c=h,u=h,p=0;p<s.length;p++){var d=s[p][0],_=s[p][1];switch(l||0===d||(a.start1=g,a.start2=o),d){case 1:a.diffs[l++]=s[p],a.length2+=_.length,u=u.substring(0,o)+_+u.substring(o);break;case n:a.length1+=_.length,a.diffs[l++]=s[p],u=u.substring(0,o)+u.substring(o+_.length);break;case 0:_.length<=2*this.Patch_Margin&&l&&s.length!=p+1?(a.diffs[l++]=s[p],a.length1+=_.length,a.length2+=_.length):_.length>=2*this.Patch_Margin&&l&&(this.patch_addContext_(a,c),f.push(a),a=new e.patch_obj,l=0,c=u,g=o)}1!==d&&(g+=_.length),d!==n&&(o+=_.length)}return l&&(this.patch_addContext_(a,c),f.push(a)),f},e.prototype.patch_deepCopy=function(t){for(var n=[],i=0;i<t.length;i++){var r=t[i],h=new e.patch_obj;h.diffs=[];for(var s=0;s<r.diffs.length;s++)h.diffs[s]=new e.Diff(r.diffs[s][0],r.diffs[s][1]);h.start1=r.start1,h.start2=r.start2,h.length1=r.length1,h.length2=r.length2,n[i]=h}return n},e.prototype.patch_apply=function(t,e){if(0==t.length)return[e,[]];t=this.patch_deepCopy(t);var i=this.patch_addPadding(t);e=i+e+i,this.patch_splitMax(t);for(var r=0,h=[],s=0;s<t.length;s++){var f,a,l=t[s].start2+r,g=this.diff_text1(t[s].diffs),o=-1;if(g.length>this.Match_MaxBits?-1!=(f=this.match_main(e,g.substring(0,this.Match_MaxBits),l))&&(-1==(o=this.match_main(e,g.substring(g.length-this.Match_MaxBits),l+g.length-this.Match_MaxBits))||f>=o)&&(f=-1):f=this.match_main(e,g,l),-1==f)h[s]=!1,r-=t[s].length2-t[s].length1;else if(h[s]=!0,r=f-l,g==(a=-1==o?e.substring(f,f+g.length):e.substring(f,o+this.Match_MaxBits)))e=e.substring(0,f)+this.diff_text2(t[s].diffs)+e.substring(f+g.length);else{var c=this.diff_main(g,a,!1);if(g.length>this.Match_MaxBits&&this.diff_levenshtein(c)/g.length>this.Patch_DeleteThreshold)h[s]=!1;else{this.diff_cleanupSemanticLossless(c);for(var u,p=0,d=0;d<t[s].diffs.length;d++){var _=t[s].diffs[d];0!==_[0]&&(u=this.diff_xIndex(c,p)),1===_[0]?e=e.substring(0,f+u)+_[1]+e.substring(f+u):_[0]===n&&(e=e.substring(0,f+u)+e.substring(f+this.diff_xIndex(c,p+_[1].length))),_[0]!==n&&(p+=_[1].length)}}}}return[e=e.substring(i.length,e.length-i.length),h]},e.prototype.patch_addPadding=function(t){for(var n=this.Patch_Margin,i="",r=1;r<=n;r++)i+=String.fromCharCode(r);for(r=0;r<t.length;r++)t[r].start1+=n,t[r].start2+=n;var h=t[0],s=h.diffs;if(0==s.length||0!=s[0][0])s.unshift(new e.Diff(0,i)),h.start1-=n,h.start2-=n,h.length1+=n,h.length2+=n;else if(n>s[0][1].length){var f=n-s[0][1].length;s[0][1]=i.substring(s[0][1].length)+s[0][1],h.start1-=f,h.start2-=f,h.length1+=f,h.length2+=f}return 0==(s=(h=t[t.length-1]).diffs).length||0!=s[s.length-1][0]?(s.push(new e.Diff(0,i)),h.length1+=n,h.length2+=n):n>s[s.length-1][1].length&&(f=n-s[s.length-1][1].length,s[s.length-1][1]+=i.substring(0,f),h.length1+=f,h.length2+=f),i},e.prototype.patch_splitMax=function(t){for(var i=this.Match_MaxBits,r=0;r<t.length;r++)if(!(t[r].length1<=i)){var h=t[r];t.splice(r--,1);for(var s=h.start1,f=h.start2,a="";0!==h.diffs.length;){var l=new e.patch_obj,g=!0;for(l.start1=s-a.length,l.start2=f-a.length,""!==a&&(l.length1=l.length2=a.length,l.diffs.push(new e.Diff(0,a)));0!==h.diffs.length&&l.length1<i-this.Patch_Margin;){var o=h.diffs[0][0],c=h.diffs[0][1];1===o?(l.length2+=c.length,f+=c.length,l.diffs.push(h.diffs.shift()),g=!1):o===n&&1==l.diffs.length&&0==l.diffs[0][0]&&c.length>2*i?(l.length1+=c.length,s+=c.length,g=!1,l.diffs.push(new e.Diff(o,c)),h.diffs.shift()):(c=c.substring(0,i-l.length1-this.Patch_Margin),l.length1+=c.length,s+=c.length,0===o?(l.length2+=c.length,f+=c.length):g=!1,l.diffs.push(new e.Diff(o,c)),c==h.diffs[0][1]?h.diffs.shift():h.diffs[0][1]=h.diffs[0][1].substring(c.length))}a=(a=this.diff_text2(l.diffs)).substring(a.length-this.Patch_Margin);var u=this.diff_text1(h.diffs).substring(0,this.Patch_Margin);""!==u&&(l.length1+=u.length,l.length2+=u.length,0!==l.diffs.length&&0===l.diffs[l.diffs.length-1][0]?l.diffs[l.diffs.length-1][1]+=u:l.diffs.push(new e.Diff(0,u))),g||t.splice(++r,0,l)}}},e.prototype.patch_toText=function(t){for(var e=[],n=0;n<t.length;n++)e[n]=t[n];return e.join("")},e.prototype.patch_fromText=function(t){var i=[];if(!t)return i;for(var r=t.split("\n"),h=0,s=/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@$/;h<r.length;){var f=r[h].match(s);if(!f)throw new Error("Invalid patch string: "+r[h]);var a=new e.patch_obj;for(i.push(a),a.start1=parseInt(f[1],10),""===f[2]?(a.start1--,a.length1=1):"0"==f[2]?a.length1=0:(a.start1--,a.length1=parseInt(f[2],10)),a.start2=parseInt(f[3],10),""===f[4]?(a.start2--,a.length2=1):"0"==f[4]?a.length2=0:(a.start2--,a.length2=parseInt(f[4],10)),h++;h<r.length;){var l=r[h].charAt(0);try{var g=decodeURI(r[h].substring(1))}catch(t){throw new Error("Illegal escape in patch_fromText: "+g)}if("-"==l)a.diffs.push(new e.Diff(n,g));else if("+"==l)a.diffs.push(new e.Diff(1,g));else if(" "==l)a.diffs.push(new e.Diff(0,g));else{if("@"==l)break;if(""!==l)throw new Error('Invalid patch mode "'+l+'" in: '+g)}h++}}return i},(e.patch_obj=function(){this.diffs=[],this.start1=null,this.start2=null,this.length1=0,this.length2=0}).prototype.toString=function(){for(var t,e=["@@ -"+(0===this.length1?this.start1+",0":1==this.length1?this.start1+1:this.start1+1+","+this.length1)+" +"+(0===this.length2?this.start2+",0":1==this.length2?this.start2+1:this.start2+1+","+this.length2)+" @@\n"],i=0;i<this.diffs.length;i++){switch(this.diffs[i][0]){case 1:t="+";break;case n:t="-";break;case 0:t=" "}e[i+1]=t+encodeURI(this.diffs[i][1])+"\n"}return e.join("").replace(/%20/g," ")},t.exports=e,t.exports.diff_match_patch=e,t.exports.DIFF_DELETE=n,t.exports.DIFF_INSERT=1,t.exports.DIFF_EQUAL=0}},e={};function n(i){var r=e[i];if(void 0!==r)return r.exports;var h=e[i]={exports:{}};return t[i](h,h.exports,n),h.exports}n.n=t=>{var e=t&&t.__esModule?()=>t.default:()=>t;return n.d(e,{a:e}),e},n.d=(t,e)=>{for(var i in e)n.o(e,i)&&!n.o(t,i)&&Object.defineProperty(t,i,{enumerable:!0,get:e[i]})},n.o=(t,e)=>Object.prototype.hasOwnProperty.call(t,e),(()=>{"use strict";var t=n(189),e=n.n(t);window.diff_match_patch=e()})()})();