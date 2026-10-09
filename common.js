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

  // 申請登録の成否をGAS側の受付ログで確認する。POST応答はno-corsのため判定に使わない。
  window.RED.createRequestId = function() {
    return "req_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 12);
  };
  window.RED.jsonp = function(params, timeoutMs) {
    return new Promise((resolve, reject) => {
      const callbackName = "redJsonp_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
      const script = document.createElement("script");
      const timer = setTimeout(() => finish(new Error("結果確認の通信がタイムアウトしました。")), timeoutMs || 10000);
      function cleanup() {
        clearTimeout(timer);
        script.remove();
        try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
      }
      function finish(error, value) {
        cleanup();
        if (error) reject(error); else resolve(value);
      }
      window[callbackName] = value => finish(null, value);
      const query = new URLSearchParams(Object.assign({}, params, {callback:callbackName, _:Date.now()}));
      script.src = GAS_URL + "?" + query.toString();
      script.onerror = () => finish(new Error("GASとの通信に失敗しました。"));
      document.body.appendChild(script);
    });
  };
  window.RED.registerApplication = async function(payload) {
    const requestId = window.RED.createRequestId();
    const request = Object.assign({}, payload, {phase:"register", requestId:requestId});
    // POST結果が読めなくても、受付IDを使ってサーバー側の登録結果を確認する。
    fetch(GAS_URL, {
      method:"POST",
      mode:"no-cors",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(request)
    }).catch(() => {});
    const started = Date.now();
    let lastStatus = null;
    while (Date.now() - started < 45000) {
      try {
        lastStatus = await window.RED.jsonp({action:"submission_status", requestId:requestId}, 8000);
        if (lastStatus && lastStatus.status === "success" && lastStatus.success === true) {
          return {requestId:requestId};
        }
        if (lastStatus && lastStatus.status === "failed") {
          const error = new Error("申請の登録に失敗しました。お手数ですが、内容を確認して再度申請してください。" + (lastStatus.message ? "\\n" + lastStatus.message : ""));
          error.code = "registration_failed";
          throw error;
        }
      } catch (error) {
        if (error && error.code === "registration_failed") throw error;
        // 一時的なJSONP通信エラーは、受付ログを再確認する。
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    const error = new Error("申請結果を確認できませんでした。二重登録を防ぐため、再申請せず教室へご連絡ください。");
    error.code = "registration_unknown";
    throw error;
  };
  window.RED.sendApplicationEmails = async function(requestId) {
    // 完了画面が描画されてから、登録済みデータを使ってメールを送信する。
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    let result = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await window.RED.jsonp({action:"send_submission_email", requestId:requestId}, 15000);
        if (result && result.success === true) return result;
      } catch (_) {
        result = {success:false, message:"メール送信結果を確認できませんでした。"};
      }
      // GASの受付ログで送信済みの宛先は記録されるため、失敗した宛先だけ再試行される。
      if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 1200));
    }
    alert("申請の登録は完了していますが、メール送信を確認できませんでした。申請を再送信せず、教室へご連絡ください。");
    return result || {success:false, message:"メール送信結果を確認できませんでした。"};
  };
})();
