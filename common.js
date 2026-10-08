(() => {
  "use strict";

  const GAS_URL="https://script.google.com/macros/s/AKfycby1q-1oxYwOgWsMgDaGvCDVg3BnTdZIeLmjrbFKMf3r53dD5DkU49D3SWXwgYxFpTo/exec";

  window.RED=window.RED||{};
  window.RED.GAS_URL=GAS_URL;
  window.RED.escapeHtml=value=>String(value??"").replace(/[&<>"']/g,char=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[char]));

  function renderSiteHeader(){
    const placeholder=document.querySelector("[data-site-header]");
    if(!placeholder || placeholder.dataset.rendered==="1") return;
    const home=document.body.dataset.siteHome||"../";
    const logo=home==="."||home==="./"?"./assets/red-logo.png":"../assets/red-logo.png";
    placeholder.outerHTML=
      '<header class="site-banner"><div class="site-banner-inner">'+
      '<a class="site-logo-link" href="'+home+'" aria-label="自立学習RED 天王台教室トップ">'+
      '<img class="site-logo" src="'+logo+'" alt="自立学習RED"></a>'+
      '<button class="site-logout" type="button" data-site-logout data-home="'+home+'">ログアウト</button>'+
      '</div></header>';
  }

  function bindLogout(){
    const logout=document.querySelector("[data-site-logout]");
    if(!logout||logout.dataset.bound==="1") return;
    logout.dataset.bound="1";
    logout.addEventListener("click",()=>{
      sessionStorage.removeItem("redLessonAuth");
      window.location.href=logout.dataset.home||"../";
    });
  }

  document.addEventListener("DOMContentLoaded",()=>{
    renderSiteHeader();
    bindLogout();
  });
})();
