(() => {
"use strict";
const $=id=>document.getElementById(id);
const form=$("courseForm"), load=$("loadMessage");
let courses=[], current=null;
const pairs=[{id:"①②",label:"①＋②",time:"15:00～16:25",slots:["①","②"]},{id:"②③",label:"②＋③",time:"15:45～17:10",slots:["②","③"]},{id:"③④",label:"③＋④",time:"16:30～17:55",slots:["③","④"]},{id:"④⑤",label:"④＋⑤",time:"17:15～18:40",slots:["④","⑤"]}];
const week=["日","月","火","水","木","金","土"];
const fmt=s=>{const d=new Date(s+"T00:00:00");return d.getFullYear()+"年"+(d.getMonth()+1)+"月"+d.getDate()+"日（"+week[d.getDay()]+"）";};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function jsonp(url){return new Promise((resolve,reject)=>{const cb="courseConfig_"+Date.now();const script=document.createElement("script");const timer=setTimeout(()=>{cleanup();reject(new Error("講習情報を取得できませんでした。"));},12000);function cleanup(){clearTimeout(timer);script.remove();delete window[cb];}window[cb]=v=>{cleanup();resolve(v);};script.onerror=()=>{cleanup();reject(new Error("講習情報を取得できませんでした。"));};script.src=url+"&callback="+cb+"&_="+Date.now();document.head.appendChild(script);});}
function selectedSubjects(){return [...$("subjects").querySelectorAll("input:checked")].map(x=>x.value);}
function selectedSlots(){return [...document.querySelectorAll(".pair-choice input:checked")].map(x=>({date:x.dataset.date,pair:x.value}));}
function renderCourse(){
 const type=$("courseType").value;current=courses.find(c=>c.type===type)||null;
 $("coursePeriod").textContent=current?"講習期間："+fmt(current.startDate)+"～"+fmt(current.endDate):"";
 $("priceDisplay").innerHTML=current?(current.priceText?esc(current.priceText).replace(/\n/g,"<br>"):"料金は教室にてご案内します。")+(current.setPrice?"<br>セット料金："+Number(current.setPrice).toLocaleString("ja-JP")+"円":"")+(current.priceNote?"<br>"+esc(current.priceNote):""):"講習を選択すると料金案内が表示されます。";
 $("slotDays").innerHTML="";$("campDays").innerHTML="";
 if(!current)return;
 current.dates.forEach(date=>{
   const d=new Date(date+"T00:00:00"),day=document.createElement("section");day.className="slot-day";
   day.innerHTML="<h3>"+fmt(date)+"</h3><div class='pair-grid'>"+pairs.map(p=>"<label class='pair-choice'><input type='checkbox' value='"+p.id+"' data-date='"+date+"'><span>"+p.label+"<small>"+p.time+"</small></span></label>").join("")+"</div>";
   $("slotDays").appendChild(day);
 });
 if(current.campDates.length){
   $("campDays").innerHTML=current.campDates.map((date,i)=>"<label class='camp-choice'><input type='checkbox' checked value='"+date+"'><span><strong>"+(i+1)+"日目</strong>　"+fmt(date)+"　13:30～20:10</span></label>").join("");
 }else $("campDays").innerHTML="<p class='muted'>この講習の合宿日程は設定されていません。</p>";
 $("slotDays").addEventListener("change",validate,{once:true});
 $("slotDays").querySelectorAll("input").forEach(x=>x.addEventListener("change",()=>{const chosen=selectedSlots();const occupied=new Set();chosen.forEach(item=>{const pair=pairs.find(p=>p.id===item.pair);pair.slots.forEach(s=>occupied.add(item.date+"|"+s));});$("slotDays").querySelectorAll("input:not(:checked)").forEach(input=>{const p=pairs.find(x=>x.id===input.value);input.disabled=p.slots.some(s=>occupied.has(input.dataset.date+"|"+s));});validate();}));
}
function required(){return selectedSubjects().length*Number($("setCount").value||0);}
function validate(){
 const id=$("studentId").value.trim(),name=$("studentName").value.trim(),email=$("email").value.trim();
 const needed=required(),chosen=selectedSlots().length;
 $("minimumCount").textContent=needed?"最低必要コマ数："+needed+"コマ（"+selectedSubjects().length+"科目×"+$("setCount").value+"セット）":"受講科目数×セット数が必要コマ数になります。";
 $("slotsCount").textContent="選択："+chosen+"コマ／必要："+(needed||"－")+"コマ";
 $("studentIdError").textContent=id&&/^1139\d{5}$/.test(id)?"": "生徒番号は1139で始まる9桁の半角数字で入力してください。";
 $("studentNameError").textContent=name?"":"氏名を入力してください。";
 $("emailError").textContent=email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?"":"メールアドレスを正しく入力してください。";
 $("courseTypeError").textContent=current?"":"講習種別を選択してください。";
 $("subjectsError").textContent=selectedSubjects().length?"":"受講科目を1つ以上選択してください。";
 $("slotsError").textContent=needed&&chosen<needed?"あと"+(needed-chosen)+"コマ選択してください。":"";
 const ok=!!current&&/^1139\d{5}$/.test(id)&&!!name&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&selectedSubjects().length>0&&needed>0&&chosen>=needed;
 $("confirmButton").disabled=!ok;
 return ok;
}
function collect(){return {action:"course",studentId:$("studentId").value.trim(),studentName:$("studentName").value.trim(),email:$("email").value.trim(),courseType:current.type,subjects:selectedSubjects(),setCount:Number($("setCount").value),slots:selectedSlots(),campDates:[...$("campDays").querySelectorAll("input:checked")].map(x=>x.value),notes:$("notes").value.trim()};}
function showConfirm(){
 const d=collect(),camp=current.campDates.map((date,i)=>(i+1)+"日目："+(d.campDates.includes(date)?"参加":"不参加")+"（"+fmt(date)+"）").join("、")||"設定なし";
 const rows=[["生徒番号",d.studentId],["生徒氏名",d.studentName],["講習種別",d.courseType],["講習期間",fmt(current.startDate)+"～"+fmt(current.endDate)],["受講科目",d.subjects.join("、")],["セット数",d.setCount+"セット"],["最低必要コマ数",required()+"コマ"],["登録コマ",d.slots.map(x=>fmt(x.date)+" "+x.pair).join("／")],["合宿参加",camp],["料金",current.priceText||"教室案内"],["連絡事項",d.notes||"なし"],["メールアドレス",d.email]];
 $("confirmationItems").innerHTML=rows.map(([k,v])=>"<div class='confirmation-item'><div class='confirmation-label'>"+esc(k)+"</div><div class='confirmation-value'>"+esc(v)+"</div></div>").join("");
 form.classList.add("hidden");$("confirmation").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"});
}
async function submit(){
 $("submitButton").disabled=true;$("backButton").disabled=true;$("loading").classList.remove("hidden");
 try{await RED.submitApplication(collect());$("confirmation").classList.add("hidden");$("success").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"});}
 catch(e){alert(e.message||"申請できませんでした。");$("submitButton").disabled=false;$("backButton").disabled=false;$("loading").classList.add("hidden");}
}
async function init(){
 try{
 const r=await jsonp(RED.GAS_URL+"?action=course_config");
 if(!r||!r.success)throw new Error(r&&r.message||"講習情報を取得できませんでした。");
 courses=r.courses||[];
 if(!courses.length){load.textContent=r.configured?"現在、受付中の講習はありません。":"講習設定がまだ完了していません。教室へお問い合わせください。";return;}
 $("courseType").innerHTML='<option value="">選択してください</option>'+courses.map(c=>'<option value="'+esc(c.type)+'">'+esc(c.type)+'</option>').join("");
 load.classList.add("hidden");form.classList.remove("hidden");
 }catch(e){load.textContent=e.message||"講習情報を取得できませんでした。";}
}
$("courseType").addEventListener("change",()=>{renderCourse();validate();});
$("subjects").addEventListener("change",validate);$("setCount").addEventListener("change",validate);
form.addEventListener("input",validate);form.addEventListener("change",validate);
form.addEventListener("submit",e=>{e.preventDefault();if(validate())showConfirm();});
$("backButton").addEventListener("click",()=>{$("confirmation").classList.add("hidden");form.classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"});});
$("submitButton").addEventListener("click",submit);
init();
})();