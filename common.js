(() => {
  "use strict";

  const GAS_URL="https://script.google.com/macros/s/AKfycbwpSTb4WiArofE1-Ajj6HchKU3RvJ_vCkHlykU1okVnYO2NWBWATQb1e3PsBL_NsyTB/exec";

  window.RED=window.RED||{};
  window.RED.GAS_URL=GAS_URL;

  // POSTの結果はCORS制約で直接読めないため、受付IDを使ってGAS側の処理結果をJSONPで確認する。
  window.RED.submitApplication = async function(payload) {
    const data = Object.assign({}, payload || {});
    const requestId = "red-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
    data.requestId = requestId;

    await fetch(window.RED.GAS_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(data)
    });

    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      const result = await new Promise((resolve, reject) => {
        const callbackName = "RED_STATUS_" + requestId.replace(/[^a-zA-Z0-9_]/g, "_");
        const script = document.createElement("script");
        let settled = false;
        const cleanup = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          script.remove();
          try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
        };
        window[callbackName] = value => { cleanup(); resolve(value); };
        script.onerror = () => { cleanup(); resolve({ success: false, pending: true }); };
        const timer = setTimeout(() => { cleanup(); resolve({ success: false, pending: true }); }, 6000);
        script.src = window.RED.GAS_URL + "?action=submission_status&requestId=" +
          encodeURIComponent(requestId) + "&callback=" + callbackName + "&_=" + Date.now();
        document.head.appendChild(script);
      });
      if (result && result.pending) {
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      if (!result || result.success !== true) {
        throw new Error(result && result.message ? result.message : "申請処理の結果を確認できませんでした。入力内容を確認して、時間をおいて再度お試しください。");
      }
      // メール送信失敗時の警告は、申請フォーム共通では表示しない。
      return result;
    }
    throw new Error("申請の受付結果を確認できませんでした。二重送信を避けるため、スプレッドシートを確認してから再申請してください。");
  };

  window.RED.escapeHtml=value=>String(value??"").replace(/[&<>"']/g,char=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[char]));


  function renderCommonFormBlocks(){
    const studentHtml =
      '<div class="field">'+
        '<label for="studentId">生徒番号 <span class="required">必須</span></label>'+
        '<input id="studentId" name="studentId" type="text" inputmode="numeric" autocomplete="off" placeholder="1139で始まる９桁の数字">'+
        '<p class="help">※生徒番号は各家庭のLINEグループにて案内されています</p><p id="studentIdError" class="error"></p>'+
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
    const logo=home+"assets/red-logo.png";
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
