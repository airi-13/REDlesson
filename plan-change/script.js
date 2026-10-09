const GAS_URL=RED.GAS_URL;
const subjects=["英語","数学","国語","理科","社会"];
const plans=["通い放題","週4パック","週6パック","週1","週2","週3","週4","週5","週6"];
const $=id=>document.getElementById(id);

function planMaxSubjects(plan){
  if(plan==="通い放題") return 5;
  if(plan==="週4パック" || plan==="週6パック") return 3;
  const m=plan.match(/^週([1-6])$/);
  return m ? Number(m[1]) : 0;
}

function makeChecks(id){
  $(id).innerHTML=subjects.map(s=>'<label class="check"><input type="checkbox" value="'+s+'">'+s+'</label>').join("");
}

makeChecks("currentSubjects");
makeChecks("nextSubjects");

const weekdayScheduleDays = [
  { day: "火", available: [4,5,6,7,8] },
  { day: "水", available: [3,4,5,6,7] },
  { day: "木", available: [4,5,6,7,8] },
  { day: "金", available: [3,4,5,6,7] }
];
const saturdayScheduleDays = [
  { day: "土", available: [1,2,3,4,5] }
];
const periodMarks = ["①","②","③","④","⑤","⑥","⑦","⑧"];
function planMaxSlots(plan){if(plan==="通い放題")return Infinity;if(plan==="週4パック")return 8;if(plan==="週6パック")return 12;const m=String(plan||"").match(/^週([1-6])$/);return m?Number(m[1])*2:0;}
function isPackPlan(plan){return plan==="週4パック"||plan==="週6パック";}
function packGradeAllowed(plan,grade){if(plan==="週4パック")return grade==="中1"||grade==="中2";if(plan==="週6パック")return grade==="中3";return true;}
function updatePackOptions(){const grade=$("grade").value;["currentPlan","nextPlan"].forEach(id=>{const select=$(id);[...select.options].forEach(option=>{if(option.value==="週4パック"||option.value==="週6パック")option.disabled=!packGradeAllowed(option.value,grade);});if(select.value&&isPackPlan(select.value)&&!packGradeAllowed(select.value,grade))select.value="";});updatePackAnnotations();updateSubjectLimits("currentPlan","currentSubjects");updateSubjectLimits("nextPlan","nextSubjects");refreshScheduleOptions("currentSchedule","currentSubjects");refreshScheduleOptions("nextSchedule","nextSubjects");}
function updatePackAnnotations(){}
function buildScheduleTable(days, periods) {
  let table = '<table class="schedule-table"><thead><tr><th>曜日</th>' + periods.map(period => '<th>' + periodMarks[period - 1] + '</th>').join('') + '</tr></thead><tbody>';
  days.forEach(row => {
    table += '<tr><th scope="row">' + row.day + '</th>';
    periods.forEach(period => {
      const mark = periodMarks[period - 1];
      if (!row.available.includes(period)) {
        table += '<td class="schedule-unavailable"><span aria-label="開校していません">ー</span></td>';
      } else {
        table += '<td><select class="schedule-select" data-day="' + row.day + '" data-period="' + period + '" aria-label="' + row.day + '曜日 ' + mark + 'コマの受講教科"><option value="">未選択</option></select></td>';
      }
    });
    table += '</tr>';
  });
  return table + '</tbody></table>';
}
function renderScheduleGrid(containerId, subjectContainerId) {
  $(containerId).innerHTML = buildScheduleTable(weekdayScheduleDays, [4,5,6,7,8]) + buildScheduleTable(saturdayScheduleDays, [1,2,3,4,5]);
  refreshScheduleOptions(containerId, subjectContainerId);
}
function refreshScheduleOptions(containerId, subjectContainerId) {
  const selected=[...document.querySelectorAll("#"+subjectContainerId+" input:checked")].map(input=>input.value);
  const planId=containerId==="currentSchedule"?"currentPlan":"nextPlan";
  const maxSlots=planMaxSlots($(planId).value);
  const selects=[...$(containerId).querySelectorAll(".schedule-select")];
  selects.forEach(select=>{const oldValue=select.value;select.innerHTML='<option value="">未選択</option>'+selected.map(subject=>'<option value="'+esc(subject)+'">'+esc(subject)+'</option>').join("");if(selected.includes(oldValue))select.value=oldValue;select.closest("td").classList.toggle("is-selected",!!select.value);select.disabled=selected.length===0;});
  const chosen=selects.filter(select=>select.value).length;
  selects.forEach(select=>{if(!select.value&&chosen>=maxSlots)select.disabled=true;});
  updateSlotCount(containerId, chosen, $(planId).value);
}
function updateSlotCount(containerId, chosen, plan){
  const target=$(containerId==="currentSchedule"?"currentSlotCount":"nextSlotCount");
  if(!target)return;
  const required=planMaxSlots(plan);
  if(!plan){target.textContent="プランを選択してください。";target.className="slot-count";return;}
  if(!Number.isFinite(required)){target.textContent="通い放題：必要な受講枠を選択してください。";target.className="slot-count";return;}
  const diff=required-chosen;
  target.className="slot-count "+(diff===0?"slot-count-ok":"slot-count-warning");
  target.textContent=diff>0?"あと"+diff+"枠選択してください。":diff<0?Math.abs(diff)+"枠多く選択されています。":"必要な"+required+"枠が選択されています。";
}
function validateNextSchedule(schedule, grade){
  if(grade==="小4以下") return "";
  const byDay={};
  schedule.forEach(item=>{(byDay[item.day] ||= []).push(item.period);});
  for(const [day, periods] of Object.entries(byDay)){
    periods.sort((a,b)=>a-b);
    if(periods.length%2!==0) return day+"曜日の受講コマは偶数個にしてください。";
    for(let i=1;i<periods.length;i++){
      if(periods[i]!==periods[i-1]+1) return day+"曜日の複数コマは、隣り合うコマを選択してください。";
    }
  }
  return "";
}
function readSchedule(containerId) {
  return [...$(containerId).querySelectorAll(".schedule-select")].filter(select => select.value)
    .map(select => ({ day: select.dataset.day, period: Number(select.dataset.period), subject: select.value }));
}
function formatSchedule(schedule) {
  return schedule.length ? schedule.map(item => item.day + "曜 " + periodMarks[item.period - 1] + " " + item.subject).join("、") : "未選択";
}
renderScheduleGrid("currentSchedule", "currentSubjects");
renderScheduleGrid("nextSchedule", "nextSubjects");
[...document.querySelectorAll(".schedule-select")].forEach(select=>select.addEventListener("change",()=>{const cid=select.closest(".schedule-grid-wrap").id;refreshScheduleOptions(cid,cid==="currentSchedule"?"currentSubjects":"nextSubjects");}));
["currentSubjects","nextSubjects"].forEach(subjectId => {
  const scheduleId = subjectId === "currentSubjects" ? "currentSchedule" : "nextSchedule";
  $(subjectId).addEventListener("change", () => refreshScheduleOptions(scheduleId, subjectId));
});


const noticeItems = {
  "週4パック": [
    "欠席した授業の振替はできないことを確認しました。",
    "通常授業は最大3教科まで選択できることを確認しました。テスト期間中の対策教科数に制限はありませんが、該当教科のテキストを保有している場合に限ります。",
    "テキストを保有している教科のみ受講できることを確認しました.",
    "一度パックに変更すると、年度内は通常料金のプランに戻せないことを確認しました。"
  ],
  "週6パック": [
    "欠席した授業の振替はできないことを確認しました。",
    "通常授業は最大3教科まで選択できることを確認しました。テスト期間中の対策教科数に制限はありませんが、該当教科のテキストを保有している場合に限ります。",
    "テキストを保有している教科のみ受講できることを確認しました。",
    "一度パックに変更すると、年度内は通常料金のプランに戻せないことを確認しました。"
  ],
  "通い放題": [
    "欠席した授業の振替はできないことを確認しました。",
    "通常授業は最大5教科まで選択できることを確認しました。テスト期間中の対策教科数に制限はありませんが、該当教科のテキストを保有している場合に限ります。",
    "テキストを保有している教科のみ受講できることを確認しました.",
    "一度パックに変更すると、年度内は通常料金のプランに戻せないことを確認しました。"
  ]
};

function updatePlanNotice() {
  const plan = $("nextPlan").value;
  const items = noticeItems[plan];
  const block = $("planNotice");
  const container = $("planNoticeItems");
  if (!items) {
    block.classList.add("hidden");
    container.innerHTML = "";
    $("planNoticeError").textContent = "";
    return;
  }
  block.classList.remove("hidden");
  container.innerHTML = items.map((item, i) =>
    '<label class="notice-check"><input type="checkbox" value="' + i + '"><span>' + esc(item) + '</span></label>'
  ).join("");
  $("planNoticeError").textContent = "";
}

$("nextPlan").addEventListener("change", updatePlanNotice);
["currentPlan","nextPlan"].forEach(id=>$(id).addEventListener("change",()=>{updatePackAnnotations();refreshScheduleOptions(id==="currentPlan"?"currentSchedule":"nextSchedule",id==="currentPlan"?"currentSubjects":"nextSubjects");}));
$("grade").addEventListener("change",updatePackOptions);

function updatePackPlanRestriction() {
  const currentPlan = $("currentPlan").value;
  const nextPlan = $("nextPlan").value;
  const packPlans = ["週4パック", "週6パック", "通い放題"];
  const currentIsPack = packPlans.includes(currentPlan);
  const nextIsOtherPlan = nextPlan !== "" && !packPlans.includes(nextPlan);

  // 注意文は「現在パック利用中」かつ「来月以降に通常料金プランを選択」の場合だけ表示
  $("packLockNotice").classList.toggle(
    "hidden",
    !(currentIsPack && nextIsOtherPlan)
  );
}

$("currentPlan").addEventListener("change", updatePackPlanRestriction);
$("nextPlan").addEventListener("change", updatePackPlanRestriction);
updatePackPlanRestriction();


function updateSubjectLimits(planId,subjectId){
  const max=planMaxSubjects($(planId).value);
  const boxes=[...document.querySelectorAll("#"+subjectId+" input")];
  boxes.forEach(box=>box.disabled=false);
  if(max>0 && boxes.filter(x=>x.checked).length>=max){
    boxes.filter(x=>!x.checked).forEach(x=>x.disabled=true);
  }
}

$("currentPlan").addEventListener("change",()=>updateSubjectLimits("currentPlan","currentSubjects"));
$("nextPlan").addEventListener("change",()=>updateSubjectLimits("nextPlan","nextSubjects"));

["currentSubjects","nextSubjects"].forEach(id=>{
  $(id).addEventListener("change",()=>{
    const planId=id==="currentSubjects"?"currentPlan":"nextPlan";
    updateSubjectLimits(planId,id);
  });
});

let current=null;

function esc(s){
  return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
}

$("form").addEventListener("submit",e=>{
  e.preventDefault();
  $("error").textContent="";

  const studentId=$("studentId").value.trim();
  const studentName=$("studentName").value.trim();
  const grade=$("grade").value;
  const currentPlan=$("currentPlan").value;
  const nextPlan=$("nextPlan").value;
  const currentSubjects=[...document.querySelectorAll("#currentSubjects input:checked")].map(x=>x.value);
  const nextSubjects=[...document.querySelectorAll("#nextSubjects input:checked")].map(x=>x.value);
  const currentSchedule=readSchedule("currentSchedule");
  const nextSchedule=readSchedule("nextSchedule");
  const notes=$("notes").value.trim();
  const email=$("email").value.trim();
  const needsTextbookPurchase=document.querySelector('input[name="needsTextbookPurchase"]:checked')?.value || "";
  const nextPlanNoticeChecks = [...document.querySelectorAll("#planNoticeItems input:checked")];
  const needsPlanNotice = Object.prototype.hasOwnProperty.call(noticeItems, nextPlan);


  if(!packGradeAllowed(currentPlan,grade)||!packGradeAllowed(nextPlan,grade)){$("error").textContent="週4パックは中1・2、週6パックは中3のみ選択できます。学年とプランを確認してください。";return;}
  const currentMax=planMaxSubjects(currentPlan);
  const nextMax=planMaxSubjects(nextPlan);

  if(!/^\d+$/.test(studentId)||!studentName||!grade||!plans.includes(currentPlan)||!plans.includes(nextPlan)||!currentSubjects.length||!nextSubjects.length||!currentSchedule.length||!nextSchedule.length||!needsTextbookPurchase||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    $("error").textContent="必須項目を正しく入力してください。";
    return;
  }

  if(needsPlanNotice && nextPlanNoticeChecks.length !== noticeItems[nextPlan].length){
    $("planNoticeError").textContent="注意事項をすべて確認し、各項目にチェックを入れてください。";
    $("planNotice").scrollIntoView({behavior:"smooth",block:"center"});
    return;
  }
  $("planNoticeError").textContent="";

  const currentIsPack = ["週4パック","週6パック","通い放題"].includes(currentPlan);
  const nextIsPack = ["週4パック","週6パック","通い放題"].includes(nextPlan);
  if (currentIsPack && !nextIsPack) {
    $("error").textContent = "パックは年度内変更することができません。来月以降もパックを選択してください。";
    return;
  }

  if(currentSubjects.length>currentMax){
    $("error").textContent="現在のプランで選択できる受講教科数を超えています。";
    return;
  }

  if(nextSubjects.length>nextMax){
    $("error").textContent="来月以降のプランで選択できる受講教科数を超えています。";
    return;
  }

  const currentRequired=planMaxSlots(currentPlan);
  const nextRequired=planMaxSlots(nextPlan);
  if(Number.isFinite(currentRequired) && currentSchedule.length!==currentRequired){
    const diff=currentRequired-currentSchedule.length;
    $("error").textContent=diff>0?"現在の受講コマはあと"+diff+"枠選択してください。":"現在の受講コマが"+Math.abs(diff)+"枠多く選択されています。";
    return;
  }
  if(Number.isFinite(nextRequired) && nextSchedule.length!==nextRequired){
    const diff=nextRequired-nextSchedule.length;
    $("error").textContent=diff>0?"来月以降の受講コマはあと"+diff+"枠選択してください。":"来月以降の受講コマが"+Math.abs(diff)+"枠多く選択されています。";
    return;
  }
  const scheduleError=validateNextSchedule(nextSchedule,grade);
  if(scheduleError){$("error").textContent=scheduleError;return;}
  current={action:"plan_change",studentId,studentName,grade,currentPlan,currentSubjects,currentSchedule,nextPlan,nextSubjects,nextSchedule,needsTextbookPurchase,notes,email};

  $("summary").innerHTML=
    '<p><span class="summary-label">生徒番号</span><br>'+esc(studentId)+'</p>'+
    '<p><span class="summary-label">氏名</span><br>'+esc(studentName)+'</p>'+
    '<p><span class="summary-label">学年</span><br>'+esc(grade)+'</p>'+
    '<p><span class="summary-label">現在のプラン</span><br>'+esc(currentPlan)+'</p>'+
    '<p><span class="summary-label">現在の受講教科</span><br>'+esc(currentSubjects.join("、"))+'</p>'+
    '<p><span class="summary-label">現在の受講コマ</span><br>'+esc(formatSchedule(currentSchedule))+'</p>'+
    '<p><span class="summary-label">来月以降のプラン</span><br>'+esc(nextPlan)+'</p>'+
    '<p><span class="summary-label">来月以降の受講教科</span><br>'+esc(nextSubjects.join("、"))+'</p>'+
    '<p><span class="summary-label">来月以降の受講コマ</span><br>'+esc(formatSchedule(nextSchedule))+'</p>'+
    '<p><span class="summary-label">テキストの追加購入</span><br>'+esc(needsTextbookPurchase)+'</p>'+
    (needsPlanNotice ? '<p><span class="summary-label">注意事項の確認</span><br>'+noticeItems[nextPlan].map((item,i)=>'✓ '+esc(item)).join("<br>")+'</p>' : '')+
    '<p><span class="summary-label">連絡事項</span><br>'+esc(notes||"なし")+'</p>'+
    '<p><span class="summary-label">メールアドレス</span><br>'+esc(email)+'</p>';

  $("form").classList.add("hidden");
  $("confirm").classList.remove("hidden");
  window.scrollTo(0,0);
});

$("back").onclick=()=>{
  $("confirm").classList.add("hidden");
  $("form").classList.remove("hidden");
};

$("submit").onclick=async()=>{
  $("submit").disabled=true;
  $("loading").classList.remove("hidden");

  try{
    await fetch(GAS_URL,{
      method:"POST",
      mode:"no-cors",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(current)
    });
    $("confirm").classList.add("hidden");
    $("success").classList.remove("hidden");
    $("textbookPurchaseNext").classList.toggle("hidden", current.needsTextbookPurchase !== "あり");
  }catch(e){
    alert("通信エラーが発生しました。時間をおいて再度お試しください。");
    $("submit").disabled=false;
    $("loading").classList.add("hidden");
  }
};
$("goTextbookPurchase").addEventListener("click",()=>{ window.location.href="../textbook/"; });
