(() => {
  "use strict";

  const GAS_URL="https://script.google.com/macros/s/AKfycby1q-1oxYwOgWsMgDaGvCDVg3BnTdZIeLmjrbFKMf3r53dD5DkU49D3SWXwgYxFpTo/exec";

  window.RED=window.RED||{};
  window.RED.GAS_URL=GAS_URL;
  window.RED.escapeHtml=value=>String(value??"").replace(/[&<>"']/g,char=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[char]));


  function renderCommonFormBlocks(){
    const studentHtml =
      '<div class="field">'+
        '<label for="studentId">生徒番号 <span class="required">必須</span></label>'+
        '<input id="studentId" name="studentId" type="text" inputmode="numeric" autocomplete="off" placeholder="1139で始まる９桁の数字">'+
        '<p id="studentIdError" class="error"></p>'+
      '</div>'+
      '<div class="field">'+
        '<label for="studentName">生徒氏名 <span class="required">必須</span></label>'+
        '<input id="studentName" name="studentName" type="text" autocomplete="name" placeholder="生徒氏名">'+
        '<p id="studentNameError" class="error"></p>'+
      '</div>';

    const otherHtml =
      '<div class="field">'+
        '<label for="notes">連絡事項</label>'+
        '<textarea id="notes" name="notes" rows="4" placeholder="連絡事項があれば入力してください"></textarea>'+
      '</div>'+
      '<div class="field">'+
        '<label for="email">メールアドレス <span class="required">必須</span></label>'+
        '<input id="email" name="email" type="email" autocomplete="email" placeholder="確認メールを受け取るメールアドレス">'+
        '<p id="emailError" class="error"></p>'+
      '</div>';

    document.querySelectorAll("[data-common-block]").forEach(block=>{
      if(block.dataset.rendered==="1") return;
      const type=block.dataset.commonBlock;
      block.classList.add("common-form-block","card");
      block.innerHTML=type==="student-info"?studentHtml:otherHtml;
      block.dataset.rendered="1";
    });
  }

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
    renderCommonFormBlocks();
    renderSiteHeader();
    bindLogout();
  });
})();
