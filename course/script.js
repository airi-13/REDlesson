(() => {
"use strict";
const $=id=>document.getElementById(id);
const form=$("courseForm"), load=$("loadMessage");
let courses=[], current=null;
const pairs=[{id:"①②",label:"①＋②",time:"15:00～16:25",slots:["①","②"]},{id:"②③",label:"②＋③",time:"15:45～17:10",slots:["②","③"]},{id:"③④",label:"③＋④",time:"16:30～17:55",slots:["③","④"]},{id:"④⑤",label:"④＋⑤",time:"17:15～18:40",slots:["④","⑤"]}];
const week=["日","月","火","水","木","金","土"];
const grades=["小4以下","小5・6","中1・2","中3・高1","高2・3"];
const fmt=s=>{const d=new Date(s+"T00:00:00");return d.getFullYear()+"年"+(d.getMonth()+1)+"月"+d.getDate()+"日（"+week[d.getDay()]+"）";};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function jsonp(url){return new Promise((resolve,reject)=>{const cb="courseConfig_"+Date.now();const script=document.createElement("script");const timer=setTimeout(()=>{cleanup();reject(new Error("講習情報を取得できませんでした。"));},12000);function cleanup(){clearTimeout(timer);script.remove();delete window[cb];}window[cb]=v=>{cleanup();resolve(v);};script.onerror=()=>{cleanup();reject(new Error("講習情報を取得できませんでした。"));};script.src=url+"&callback="+cb+"&_="+Date.now();document.head.appendChild(script);});}
function updatePriceDisplay(){
 if(!current){$("priceDisplay").textContent="講習を選択すると料金案内が表示されます。";return;}
 const grade=$("grade").value,sets=Number($("setCount").value||0);
 const price=Number((current.prices[String(sets)]||{})[grade]||0);
 const tableRows=Object.keys(current.prices||{}).map(Number).filter(n=>Number.isInteger(n)&&n>0).sort((x,y)=>x-y).map(n=>{
  const row=current.prices[String(n)]||{};
  return "<tr><th>"+n+"セット</th>"+grades.map(g=>"<td>"+(Number(row[g]||0)?Number(row[g]).toLocaleString("ja-JP")+"円":"－")+"</td>").join("")+"</tr>";
 }).join("");
 const table="<div class='table-wrap'><table class='course-price-table'><thead><tr><th>セット回数</th>"+grades.map(g=>"<th>"+esc(g)+"</th>").join("")+"</tr></thead><tbody>"+tableRows+"</tbody></table></div>";
 const selected=grade&&sets?(price?"<br><br><strong>"+esc(grade)+"・"+sets+"セット："+price.toLocaleString("ja-JP")+"円</strong>":"<br><br>この学年・セット回数の料金は未設定です。"):"<br><br>学年区分とセット回数を選択すると該当料金が表示されます。";
 $("priceDisplay").innerHTML=(current.priceText?esc(current.priceText).replace(/\n/g,"<br>")+"<br>":"")+"<strong>"+esc(current.type)+" 料金表</strong>"+table+selected+(current.priceNote?"<br>"+esc(current.priceNote):"");
}
function renderSetOptions(){
 const select=$("setCount"),previous=select.value,grade=$("grade").value;
 const counts=(current&&current.availableSetCounts||[]).filter(n=>{
  if(!grade)return grades.some(g=>Number((current.prices[String(n)]||{})[g]||0)>0);
  return Number((current.prices[String(n)]||{})[grade]||0)>0;
 });
 select.innerHTML='<option value="">選択してください</option>'+counts.map(n=>'<option value="'+n+'">'+n+'セット</option>').join("");
 if(counts.includes(Number(previous)))select.value=previous;
}
function selectedSubjects(){return [...$("subjects").querySelectorAll("input:checked")].map(x=>x.value);}
function selectedSlots(){return [...document.querySelectorAll(".pair-choice input:checked")].map(x=>({date:x.dataset.date,pair:x.value}));}
function renderCourse(){
 const type=$("courseType").value;current=courses.find(c=>c.type===type)||null;
 $("coursePeriod").innerHTML=current?current.ranges.map(r=>"<div><strong>"+esc(r.label)+"</strong>："+fmt(r.startDate)+"～"+fmt(r.endDate)+"</div>").join(""):"";
 renderSetOptions();updatePriceDisplay();$("slotDays").innerHTML="";$("campDays").innerHTML="";if(!current)return;
 current.ranges.forEach(range=>{const group=document.createElement("div");group.className="course-range";group.innerHTML="<h3>"+esc(range.label)+"</h3>";range.dates.forEach(date=>{const day=document.createElement("section");day.className="slot-day";day.innerHTML="<h4>"+fmt(date)+"</h4><div class='pair-grid'>"+pairs.map(p=>"<label class='pair-choice'><input type='checkbox' value='"+p.id+"' data-date='"+date+"'><span>"+p.label+"<small>"+p.time+"</small></span></label>").join("")+"</div>";group.appendChild(day);});$("slotDays").appendChild(group);});
 $("campDays").innerHTML=current.campDates.length?current.campDates.map((date,i)=>"<label class='camp-choice'><input type='checkbox' checked value='"+date+"'><span><strong>"+(i+1)+"日目</strong>　"+fmt(date)+"　13:30～20:10</span></label>").join(""):"<p class='muted'>この講習の合宿日程は設定されていません。</p>";
 function refresh(){const occupied=new Set();selectedSlots().forEach(x=>pairs.find(p=>p.id===x.pair).slots.forEach(s=>occupied.add(x.date+"|"+s)));$("slotDays").querySelectorAll("input").forEach(input=>{if(input.checked){input.disabled=false;return;}input.disabled=pairs.find(p=>p.id===input.value).slots.some(s=>occupied.has(input.dataset.date+"|"+s));});}
 $("slotDays").querySelectorAll("input").forEach(x=>x.addEventListener("change",()=>{refresh();validate();}));
}
function required(){return selectedSubjects().length*Number($("setCount").value||0);}
function validate(){
 const id=$("studentId").value.trim(),name=$("studentName").value.trim(),email=$("email").value.trim(),grade=$("grade").value;
 const needed=required(),chosen=selectedSlots().length;
 $("minimumCount").textContent=needed?"最低必要コマ数："+needed+"コマ（"+selectedSubjects().length+"科目×"+$("setCount").value+"セット）":"受講科目数×セット数が必要コマ数になります。";
 $("slotsCount").textContent="選択："+chosen+"コマ／必要："+(needed||"－")+"コマ";
 $("studentIdError").textContent=id&&/^1139\d{5}$/.test(id)?"": "生徒番号は1139で始まる9桁の半角数字で入力してください。";
 $("studentNameError").textContent=name?"":"氏名を入力してください。";
 $("emailError").textContent=email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?"":"メールアドレスを正しく入力してください。";
 $("courseTypeError").textContent=current?"":"講習種別を選択してください。";
 $("gradeError").textContent=grade?"":"学年区分を選択してください。";
 $("subjectsError").textContent=selectedSubjects().length?"":"受講科目を1つ以上選択してください。";
 $("slotsError").textContent=needed&&chosen<needed?"あと"+(needed-chosen)+"コマ選択してください。":"";
 const sets=Number($("setCount").value||0),price=Number(current&&current.prices&&current.prices[String(sets)]&&current.prices[String(sets)][grade]||0);
 const ok=!!current&&/^1139\d{5}$/.test(id)&&!!name&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&!!grade&&!!sets&&price>0&&selectedSubjects().length>0&&needed>0&&chosen>=needed;
 $("confirmButton").disabled=!ok;
 return ok;
}
function collect(){const grade=$("grade").value,setCount=Number($("setCount").value),totalPrice=Number((current.prices[String(setCount)]||{})[grade]||0);return {action:"course",grade:grade,totalPrice:totalPrice,studentId:$("studentId").value.trim(),studentName:$("studentName").value.trim(),email:$("email").value.trim(),courseType:current.type,subjects:selectedSubjects(),setCount:setCount,slots:selectedSlots(),campDates:[...$("campDays").querySelectorAll("input:checked")].map(x=>x.value),notes:$("notes").value.trim()};}
function showConfirm(){
 const d=collect(),camp=current.campDates.map((date,i)=>(i+1)+"日目："+(d.campDates.includes(date)?"参加":"不参加")+"（"+fmt(date)+"）").join("、")||"設定なし";
 const rows=[["生徒番号",d.studentId],["生徒氏名",d.studentName],["講習種別",d.courseType],["講習日程",current.ranges.map(r=>r.label+"："+fmt(r.startDate)+"～"+fmt(r.endDate)).join("／")],["学年区分",d.grade],["受講科目",d.subjects.join("、")],["セット数",d.setCount+"セット"],["最低必要コマ数",required()+"コマ"],["登録コマ",d.slots.map(x=>fmt(x.date)+" "+x.pair).join("／")],["合宿参加",camp],["料金",d.totalPrice.toLocaleString("ja-JP")+"円"],["連絡事項",d.notes||"なし"],["メールアドレス",d.email]];
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
$("grade").addEventListener("change",()=>{renderSetOptions();updatePriceDisplay();validate();});
$("subjects").addEventListener("change",validate);$("setCount").addEventListener("change",()=>{updatePriceDisplay();validate();});
form.addEventListener("input",validate);form.addEventListener("change",validate);
form.addEventListener("submit",e=>{e.preventDefault();if(validate())showConfirm();});
$("backButton").addEventListener("click",()=>{$("confirmation").classList.add("hidden");form.classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"});});
$("submitButton").addEventListener("click",submit);
init();
})();