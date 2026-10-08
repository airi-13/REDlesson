const GAS_URL=RED.GAS_URL;
const subjects=["英語","数学","国語","理科","社会"];
const plans=["通い放題","週4/6プラン","週1","週2","週3","週4","週5","週6"];
const $=id=>document.getElementById(id);

function planMaxSubjects(plan){
  if(plan==="通い放題") return 5;
  if(plan==="週4/6プラン") return 3;
  const m=plan.match(/^週([1-6])$/);
  return m ? Number(m[1]) : 0;
}

function makeChecks(id){
  $(id).innerHTML=subjects.map(s=>'<label class="check"><input type="checkbox" value="'+s+'">'+s+'</label>').join("");
}

makeChecks("currentSubjects");
makeChecks("nextSubjects");

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
  const currentPlan=$("currentPlan").value;
  const nextPlan=$("nextPlan").value;
  const currentSubjects=[...document.querySelectorAll("#currentSubjects input:checked")].map(x=>x.value);
  const nextSubjects=[...document.querySelectorAll("#nextSubjects input:checked")].map(x=>x.value);
  const notes=$("notes").value.trim();
  const email=$("email").value.trim();

  const currentMax=planMaxSubjects(currentPlan);
  const nextMax=planMaxSubjects(nextPlan);

  if(!/^\d+$/.test(studentId)||!studentName||!plans.includes(currentPlan)||!plans.includes(nextPlan)||!currentSubjects.length||!nextSubjects.length||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    $("error").textContent="必須項目を正しく入力してください。";
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

  current={action:"plan_change",studentId,studentName,currentPlan,currentSubjects,nextPlan,nextSubjects,notes,email};

  $("summary").innerHTML=
    '<p><span class="summary-label">生徒番号</span><br>'+esc(studentId)+'</p>'+
    '<p><span class="summary-label">氏名</span><br>'+esc(studentName)+'</p>'+
    '<p><span class="summary-label">現在のプラン</span><br>'+esc(currentPlan)+'</p>'+
    '<p><span class="summary-label">現在の受講教科</span><br>'+esc(currentSubjects.join("、"))+'</p>'+
    '<p><span class="summary-label">来月以降のプラン</span><br>'+esc(nextPlan)+'</p>'+
    '<p><span class="summary-label">来月以降の受講教科</span><br>'+esc(nextSubjects.join("、"))+'</p>'+
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
  }catch(e){
    alert("通信エラーが発生しました。時間をおいて再度お試しください。");
    $("submit").disabled=false;
    $("loading").classList.add("hidden");
  }
};