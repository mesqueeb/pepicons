(function(e,t){typeof exports=="object"&&typeof module!="undefined"?t(exports,require("vue"),require("pepicons")):typeof define=="function"&&define.amd?define(["exports","vue","pepicons"],t):(e=typeof globalThis!="undefined"?globalThis:e||self,t(e.VuePepicons={},e.Vue,e.pepicons))})(this,function(e,t,s){"use strict";var l="",u=(n,i)=>{const o=n.__vccOpts||n;for(const[r,p]of i)o[r]=p;return o};const d=t.defineComponent({name:"Pepicon",props:{name:{type:String,required:!0},type:{type:String,default:"print"},color:{type:String},opacity:{type:Number},stroke:{type:String,default:"black"},size:{type:[String,Number],default:"md"}},computed:{svg(){const{name:n,type:i,color:o,opacity:r,size:p,stroke:c}=this;return s.pepiconSvgString({name:n,type:i,color:o,opacity:r,size:p,stroke:c})}}}),f=["innerHTML"];function a(n,i,o,r,p,c){return t.openBlock(),t.createElementBlock("div",{class:"pepicon",innerHTML:n.svg},null,8,f)}var _=u(d,[["render",a]]);e.Pepicon=_,Object.defineProperty(e,"__esModule",{value:!0}),e[Symbol.toStringTag]="Module"});
