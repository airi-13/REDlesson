(() => {
  "use strict";

  // GAS側のAPI URL。現在の欠席・振替システムと同じエンドポイントを使用します。
  const GAS_URL=RED.GAS_URL;

  const PERIODS = {
    "①":"15:00～15:40","②":"15:45～16:25","③":"16:30～17:10","④":"17:15～17:55",
    "⑤":"18:00～18:40","⑥":"18:45～19:25","⑦":"19:30～20:10","⑧":"20:15～20:55"
  };

  const AVAILABLE = {
    0:[],1:[],2:["④","⑤","⑥","⑦","⑧"],3:["③","④","⑤","⑥","⑦"],
    4:["④","⑤","⑥","⑦","⑧"],5:["③","④","⑤","⑥","⑦"],6:["①","②","③","④","⑤"]
  };

  const $ = id => document.getElementById(id);
  const form = $("applicationForm");
  const absenceDate = $("absenceDate");
  const makeupDate = $("makeupDate");
  const registeredAbsence = $("registeredAbsence");
  const makeupUndecided = $("makeupUndecided");
  const absencePeriods = $("absencePeriods");
  const makeupPeriods = $("makeupPeriods");
  const makeupFields = $("makeupFields");
  const confirmation = $("confirmation");
  const success = $("success");

  function todayString(){
    const d=new Date();
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  }

  function parseDate(s){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(s||"")) return null;
    const [y,m,d]=s.split("-").map(Number);
    const x=new Date(y,m-1,d);
    return x.getFullYear()===y&&x.getMonth()===m-1&&x.getDate()===d?x:null;
  }

  function formatDate(s){
    const d=parseDate(s); if(!d) return s||"";
    const w=["日","月","火","水","木","金","土"];
    return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${w[d.getDay()]}）`;
  }

  function availablePeriods(s){ const d=parseDate(s); return d?AVAILABLE[d.getDay()]||[]:[]; }

  function renderPeriods(container, date, type){
    const previous = [...container.querySelectorAll("input:checked")].map(x=>x.value);
    container.innerHTML="";
    const periods=availablePeriods(date);
    if(!date){ container.innerHTML='<div class="period-disabled">日付を選択してください。</div>'; return; }
    if(!periods.length){ container.innerHTML='<div class="period-disabled">日曜日・月曜日は休校日です。</div>'; return; }
    periods.forEach((p,i)=>{
      const wrap=document.createElement("div");
      wrap.className="period-card";
      const input=document.createElement("input");
      input.type="checkbox"; input.id=`${type}-${i}`; input.value=p;
      input.checked=previous.includes(p);
      const label=document.createElement("label");
      label.htmlFor=input.id;
      label.innerHTML=`<span class="period-number">${p}</span><span class="period-time">${PERIODS[p]}</span>`;
      wrap.append(input,label); container.appendChild(wrap);
      input.addEventListener("change",update);
    });
  }

  function selected(container){ return [...container.querySelectorAll("input:checked")].map(x=>x.value); }

  function startTime(p){
    return {"①":[15,0],"②":[15,45],"③":[16,30],"④":[17,15],"⑤":[18,0],"⑥":[18,45],"⑦":[19,30],"⑧":[20,15]}[p];
  }

  function passesFiveMinuteRule(date,p){
    if(registeredAbsence.checked || date!==todayString()) return date>todayString();
    const t=startTime(p); if(!t) return false;
    const now=new Date(), start=new Date(now.getFullYear(),now.getMonth(),now.getDate(),t[0],t[1]);
    return start.getTime() >= now.getTime()+5*60*1000;
  }

  function setRanges(){
    if(registeredAbsence.checked) absenceDate.min="";
    else absenceDate.min=todayString();

    if(absenceDate.value){
      const a=parseDate(absenceDate.value);
      const max=new Date(a); max.setDate(max.getDate()+28);
      const f=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
      makeupDate.min=f(a); makeupDate.max=f(max);
    }else{
      makeupDate.min=""; makeupDate.max="";
    }
  }

  function errors(){
    const e=[];
    const id=$("studentId").value.trim(), name=$("studentName").value.trim(), mail=$("email").value.trim();
    $("studentIdError").textContent = /^\d+$/.test(id) ? "" : "生徒番号は半角数字で入力してください。";
    if(!id) $("studentIdError").textContent="生徒番号を入力してください。";
    $("studentNameError").textContent = name ? "" : "氏名を入力してください。";
    $("emailError").textContent = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail) ? "" : "メールアドレスの形式が正しくありません。";
    if(!mail) $("emailError").textContent="メールアドレスを入力してください。";
    if(!/^\d+$/.test(id)) e.push("id");
    if(!name) e.push("name");
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) e.push("mail");

    const ad=parseDate(absenceDate.value), ap=selected(absencePeriods);
    if(!ad){ $("absenceDateError").textContent="欠席日を選択してください。"; e.push("absenceDate"); }
    else if([0,1].includes(ad.getDay())){ $("absenceDateError").textContent="日曜日・月曜日は休校日です。"; e.push("absenceDate"); }
    else if(!registeredAbsence.checked && absenceDate.value<todayString()){ $("absenceDateError").textContent="過去の日付は選択できません。"; e.push("absenceDate"); }
    else $("absenceDateError").textContent="";

    if(!ap.length){ $("absencePeriodsError").textContent="欠席する時間を選択してください。"; e.push("absencePeriods"); }
    else if(!registeredAbsence.checked && ap.some(p=>!passesFiveMinuteRule(absenceDate.value,p))){ $("absencePeriodsError").textContent="授業開始5分前を過ぎたコマは欠席申請できません。"; e.push("absencePeriods"); }
    else $("absencePeriodsError").textContent="";

    if(makeupUndecided.checked){
      $("makeupDateError").textContent="";
      $("makeupPeriodsError").textContent="";
    }else{
      const md=parseDate(makeupDate.value), mp=selected(makeupPeriods);
      if(!md){ $("makeupDateError").textContent="振替日を選択してください。"; e.push("makeupDate"); }
      else if([0,1].includes(md.getDay())){ $("makeupDateError").textContent="日曜日・月曜日は休校日です。"; e.push("makeupDate"); }
      else if(ad && (md<ad || md.getTime()>new Date(ad.getFullYear(),ad.getMonth(),ad.getDate()+28).getTime())){ $("makeupDateError").textContent="振替日は欠席日から4週間以内にしてください。"; e.push("makeupDate"); }
      else $("makeupDateError").textContent="";
      if(mp.length!==ap.length || !mp.length){
        $("makeupPeriodsError").textContent=`欠席するコマ数と振替するコマ数を同じにしてください。（欠席：${ap.length}コマ／振替：${mp.length}コマ）`;
        e.push("makeupPeriods");
      }else $("makeupPeriodsError").textContent="";
    }
    return e;
  }

  function update(){
    setRanges();
    const valid=errors().length===0;
    $("confirmButton").disabled=!valid;
  }

  function collect(){
    return {
      studentId:$("studentId").value.trim(),
      studentName:$("studentName").value.trim(),
      absenceDate:absenceDate.value,
      absencePeriods:selected(absencePeriods),
      makeupDate:makeupUndecided.checked?"未定":makeupDate.value,
      makeupPeriods:makeupUndecided.checked?["未定"]:selected(makeupPeriods),
      makeupUndecided:makeupUndecided.checked,
      absenceRegistered:registeredAbsence.checked,
      notes:$("notes").value.trim(),
      email:$("email").value.trim()
    };
  }

  function showConfirmation(){
    const data=collect();
    const rows=[
      ["申請区分",registeredAbsence.checked?"欠席登録済みの授業の振替":"通常の欠席・振替申請"],
      ["生徒番号",data.studentId],["氏名",data.studentName],
      ["欠席日",formatDate(data.absenceDate)],
      ["欠席時間",data.absencePeriods.map(p=>`${p} ${PERIODS[p]}`).join("、")],
      ["振替日",data.makeupDate==="未定"?"未定":formatDate(data.makeupDate)],
      ["振替時間",data.makeupPeriods[0]==="未定"?"未定":data.makeupPeriods.map(p=>`${p} ${PERIODS[p]}`).join("、")],
      ["連絡事項",data.notes||"なし"],["メールアドレス",data.email]
    ];
    $("confirmationItems").innerHTML=rows.map(([l,v])=>`<div class="confirmation-item"><div class="confirmation-label">${l}</div><div class="confirmation-value">${escapeHtml(v)}</div></div>`).join("");
    form.classList.add("hidden"); confirmation.classList.remove("hidden"); window.scrollTo({top:0,behavior:"smooth"});
  }

  function escapeHtml(v){ return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

  async function submit(){
    const data=collect();
    if(errors().length){ alert("入力内容を確認してください。"); return; }

    $("submitButton").disabled=true;
    $("backButton").disabled=true;
    $("loading").classList.remove("hidden");

    try{
      await fetch(GAS_URL,{
        method:"POST",
        mode:"no-cors",
        headers:{"Content-Type":"text/plain;charset=utf-8"},
        body:JSON.stringify({...data,action:"absence"})
      });

      confirmation.classList.add("hidden");
      success.classList.remove("hidden");
      window.scrollTo({top:0,behavior:"smooth"});
    }catch(err){
      alert("申請の送信に失敗しました。\\n\\n通信エラーが発生しました。時間をおいてもう一度お試しください。");
      $("submitButton").disabled=false;
      $("backButton").disabled=false;
      $("loading").classList.add("hidden");
    }
  }

  registeredAbsence.addEventListener("change",()=>{ setRanges(); renderPeriods(absencePeriods,absenceDate.value,"absence"); update(); });
  absenceDate.addEventListener("change",()=>{ renderPeriods(absencePeriods,absenceDate.value,"absence"); setRanges(); renderPeriods(makeupPeriods,makeupDate.value,"makeup"); update(); });
  makeupDate.addEventListener("change",()=>{ renderPeriods(makeupPeriods,makeupDate.value,"makeup"); update(); });
  makeupUndecided.addEventListener("change",()=>{ makeupFields.classList.toggle("hidden",makeupUndecided.checked); update(); });
  form.addEventListener("input",update);
  form.addEventListener("change",update);
  form.addEventListener("submit",e=>{e.preventDefault();showConfirmation();});
  $("backButton").addEventListener("click",()=>{confirmation.classList.add("hidden");form.classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"});});
  $("submitButton").addEventListener("click",submit);

  setRanges();
  renderPeriods(absencePeriods,"","absence");
  renderPeriods(makeupPeriods,"","makeup");
  update();
})();