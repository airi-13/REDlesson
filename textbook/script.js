const GAS_URL="https://script.google.com/macros/s/AKfycby1q-1oxYwOgWsMgDaGvCDVg3BnTdZIeLmjrbFKMf3r53dD5DkU49D3SWXwgYxFpTo/exec";
const TEXTBOOKS=[["高校生","理科","全学年","フォレスタ生物"],["中学生","英語","3年","フォレスタ英語中３"],["小学生","数学","6年","フォレスタステップ算数"],["中学生","英語","2年","フォレスタ英語中２"],["小学生","英語","全学年","フォレスタ小学英語Ⅰ（英検5級相当）"],["中学生","英語・数学","新高1","フォレスタ高校準備講座 数学Ⅰ・英文法Ⅰ"],["高校生","数学","全学年","フォレスタ数Ⅲ"],["中学生","社会","全学年","フォレスタステップ社会"],["高校生","理科","全学年","フォレスタ化学"],["中学生","数学","1年","フォレスタ数学中１"],["高校生","数学","全学年","フォレスタ数A"],["高校生","社会","全学年","フォレスタ地理総合"],["中学生","英語","3年","フォレスタステップ英語中３"],["小学生","英語","全学年","フォレスタ小学英語Ⅲ（英検3級相当）"],["中学生","国語","1年","iワーク中１"],["高校生","数学","全学年","フォレスタ数Ⅰ"],["中学生","数学","2年","フォレスタステップ数学中２"],["小学生","数学","5年","フォレスタステップ算数"],["小学生","数学","3年","フォレスタ算数３年"],["高校生","英語","全学年","フォレスタ英語構文"],["高校生","国語","全学年","フォレスタ小論文"],["高校生","英語","全学年","フォレスタ高校英文法Ⅰ"],["中学生","理科","1年","フォレスタ理科中１"],["中学生","数学","3年","フォレスタドリル数学中３"],["中学生","数学","1年","フォレスタドリル数学中１"],["小学生","数学","6年","フォレスタ算数６年"],["中学生","英語","全学年","フォレスタ英単語"],["中学生","英語","全学年","フォレスタゴール英語"],["中学生","英語","2年","フォレスタドリル英語中２"],["中学生","社会","全学年","フォレスタゴール社会"],["小学生","国語","5年","NEW小学生ワーク国語"],["中学生","数学","全学年","フォレスタゴール数学"],["中学生","英語","3年","フォレスタドリル英語中３"],["小学生","英語","全学年","フォレスタ小学英語Ⅱ（英検4級相当）"],["小学生","国語","6年","NEW小学生ワーク国語"],["中学生","国語","2年","iワーク中２"],["小学生","数学","4年","フォレスタステップ算数"],["中学生","英語","1年","フォレスタステップ英語中１"],["中学生","国語","全学年","フォレスタゴール国語"],["中学生","社会","全学年","フォレスタ地理"],["中学生","理科","全学年","フォレスタゴール理科"],["中学生","理科","2年","フォレスタ理科中２"],["中学生","国語","3年","iワーク中３"],["中学生","理科","3年","フォレスタ理科中３"],["中学生","理科","全学年","フォレスタステップ理科"],["中学生","英語","1年","フォレスタ英語中１"],["中学生","英語","2年","フォレスタステップ英語中２"],["小学生","数学","4年","フォレスタドリル算数４年"],["高校生","数学","全学年","フォレスタ数C"],["高校生","理科","全学年","フォレスタ物理"],["小学生","数学","4年","フォレスタ算数４年"],["高校生","理科","全学年","フォレスタ生物基礎"],["小学生","数学","6年","フォレスタドリル算数６年"],["高校生","社会","全学年","フォレスタ歴史総合"],["高校生","国語","全学年","フォレスタ言語文化"],["中学生","数学","3年","フォレスタ数学中３"],["中学生","数学","1年","フォレスタステップ数学中１"],["中学生","数学","2年","フォレスタ数学中２"],["高校生","数学","全学年","フォレスタ数Ⅱ"],["小学生","数学","5年","フォレスタ算数５年"],["高校生","理科","全学年","フォレスタ物理基礎"],["高校生","数学","全学年","フォレスタ数B"],["中学生","国語","全学年","フォレスタステップ国語"],["高校生","理科","全学年","フォレスタ化学基礎"],["中学生","社会","全学年","フォレスタ歴史"],["中学生","数学","2年","フォレスタドリル数学中２"],["中学生","英語","1年","フォレスタドリル英語中１"],["小学生","英語・数学","新中1","フォレスタ中学準備講座 数学・英語"],["小学生","数学","3年","フォレスタドリル算数３年"],["小学生","数学","3年","フォレスタステップ算数"],["中学生","社会","全学年","フォレスタ公民"],["中学生","数学","3年","フォレスタステップ数学中３"],["小学生","数学","5年","フォレスタドリル算数５年"]];
let current=null;

const $=id=>document.getElementById(id);
function show(id){["listPage","purchasePage","previewPage","completePage"].forEach(x=>$(x).classList.add("hidden"));$(id).classList.remove("hidden");window.scrollTo(0,0)}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}

$("levelFilter").onchange=()=>{
  refreshFilterOptions();
  refreshFilterOptions();
renderBooks();
};
$("subjectFilter").onchange=renderBooks;
$("gradeFilter").onchange=renderBooks;

const SUBJECT_ORDER={"英語":1,"数学":2,"英語・数学":2,"国語":3,"理科":4,"社会":5};
const SERIES_ORDER={"フォレスタ":1,"フォレスタステップ":2,"フォレスタゴール":3,"フォレスタドリル":4};
function gradeNumber(value){const m=String(value).match(/(?:新)?(?:中|高)?([1-6])/);return m?Number(m[1]):99;}
function seriesRank(title){for(const key of Object.keys(SERIES_ORDER)){if(title.startsWith(key))return SERIES_ORDER[key];}return 99;}
function textbookNumber(title){const m=String(title).match(/(?:中|算数|数学|英語)?\s*(\d+)/);return m?Number(m[1]):99;}
function compareBooks(a,b){
 const subjectA=SUBJECT_ORDER[a[1]]??99,subjectB=SUBJECT_ORDER[b[1]]??99;
 if(subjectA!==subjectB)return subjectA-subjectB;
 const seriesA=seriesRank(a[3]),seriesB=seriesRank(b[3]);
 if(seriesA!==seriesB)return seriesA-seriesB;
 const gradeA=gradeNumber(a[2]),gradeB=gradeNumber(b[2]);
 if(gradeA!==gradeB)return gradeA-gradeB;
 const numA=textbookNumber(a[3]),numB=textbookNumber(b[3]);
 if(numA!==numB)return numA-numB;
 return a[3].localeCompare(b[3],"ja");
}

function renderBooks(){
 const lv=$("levelFilter").value,su=$("subjectFilter").value,gr=$("gradeFilter").value;
 const filtered=TEXTBOOKS.filter(b=>{
   if(lv && b[0]!==lv) return false;
   if(su && b[1]!==su) return false;
   if(gr && b[2]!==gr && b[2]!=="全学年") return false;
   return true;
 }).sort(compareBooks);

 const notice=$("textbookNotice");
 let noticeHtml="テキストを持っている教科のみ受講できます。";
 if((lv==="小学生"&&(su==="英語"||su==="国語"))||lv==="高校生"||(lv==="中学生"&&!su)){
   noticeHtml="テキストを持っている教科のみ受講できます。";
 }else if(lv==="中学生"&&su==="国語"){
   noticeHtml="iワーク（予習用）＋フォレスタステップ（復習用）を持っている場合のみ受講できます。<br>その他教材は任意購入となります。";
 }else if((lv==="中学生"&&["英語","数学","理科","社会"].includes(su))||(lv==="小学生"&&su==="数学")){
   noticeHtml="フォレスタ（予習用）＋フォレスタステップ（復習用）を持っている場合のみ受講できます。<br>その他教材は任意購入となります。";
 }
 notice.innerHTML=noticeHtml;
 notice.classList.toggle("hidden",!noticeHtml);
 const groups={};
 filtered.forEach(b=>{let s=b[1];if(b[0]==="小学生"&&s==="数学")s="数学・算数";(groups[s]??=[]).push(b)});
 const groupOrder={"英語":1,"数学・算数":2,"数学":2,"国語":3,"理科":4,"社会":5,"英語・数学":6};
 const groupNames=Object.keys(groups).sort((a,b)=>(groupOrder[a]??99)-(groupOrder[b]??99));
 $("textbooks").innerHTML=groupNames.map(s=>{
   const seriesGroups={};
   groups[s].forEach(b=>{
     const key=seriesRank(b[3])===1?"フォレスタ":
       seriesRank(b[3])===2?"フォレスタステップ":
       seriesRank(b[3])===3?"フォレスタゴール":
       seriesRank(b[3])===4?"フォレスタドリル":
       b[3].replace(/(?:中|算数|数学|英語)?\s*[1-6](?:年|級)?/g,"").trim();
     (seriesGroups[key]??=[]).push(b);
   });
   const seriesNames=Object.keys(seriesGroups).sort((a,b)=>{
     const ra=SERIES_ORDER[a]??99,rb=SERIES_ORDER[b]??99;
     return ra!==rb?ra-rb:a.localeCompare(b,"ja");
   });
   return `<section class="subject-section">
     <div class="subject-title">${esc(s)}</div>
     ${seriesNames.map(name=>`<div class="textbook-group">
       <div class="textbook-group-title">${esc(name)}</div>
       <div class="textbook-grid">${seriesGroups[name].sort((a,b)=>gradeNumber(a[2])-gradeNumber(b[2])).map(b=>`<div class="textbook-card">
         <div class="textbook-name">${esc(b[3])}</div>
         <div class="meta"><span class="tag">${esc(b[0])}</span><span class="tag">${esc(b[2])}</span></div>
       </div>`).join("")}</div>
     </div>`).join("")}
   </section>`;
 }).join("")||"<div class='notice'>該当するテキストはありません。</div>";
}
$("purchaseNav").onclick=()=>{show("purchasePage");if(!$("items").children.length)addItem()};
$("backList").onclick=()=>show("listPage");
$("completeBack").onclick=()=>show("listPage");
$("edit").onclick=()=>show("purchasePage");
$("addItem").onclick=addItem;

const LEVEL_SUBJECTS={
  "小学生":["英語","数学","国語"],
  "中学生":["英語","数学","国語","理科","社会","英語・数学"],
  "高校生":["英語","数学","国語","理科","社会"]
};

const LEVEL_GRADES={
  "小学生":["1年","2年","3年","4年","5年","6年","新中1"],
  "中学生":["1年","2年","3年","新高1"],
  "高校生":["1年","2年","3年"]
};

function setSelectOptions(select, values, allLabel){
  const current=select.value;
  select.innerHTML=`<option value="">${allLabel}</option>`+
    values.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("");
  if(values.includes(current)) select.value=current;
}

function refreshFilterOptions(){
  const level=$("levelFilter").value;
  const subjects=level ? LEVEL_SUBJECTS[level] : ["英語","数学","国語","理科","社会","英語・数学"];
  const grades=level ? LEVEL_GRADES[level] : ["1年","2年","3年","4年","5年","6年","新中1","新高1"];
  setSelectOptions($("subjectFilter"),subjects,"すべての科目");
  setSelectOptions($("gradeFilter"),grades,"すべての学年");
}

function options(type){
  if(type==="level") return ["小学生","中学生","高校生"];
  if(type==="subject") return ["国語","数学","英語","理科","社会","英語・数学"];
  return ["1年","2年","3年","4年","5年","6年","新中1","新高1"];
}

function addItem(){
 const n=$("items").children.length+1,d=document.createElement("div");d.className="purchase-item";
 d.innerHTML=`<div class="item-head"><strong>テキスト ${n}</strong><button class="remove">削除</button></div><div class="item-grid">
 <label>区分<select class="level">${options("level").map(x=>`<option>${x}</option>`).join("")}</select></label>
 <label>科目<select class="subject">${options("subject").map(x=>`<option>${x}</option>`).join("")}</select></label>
 <label>学年<select class="grade">${options("grade").map(x=>`<option>${x}</option>`).join("")}</select></label>
 <label>数量<input class="qty" type="number" min="1" step="1" value="1"></label></div>
 <label style="margin-top:12px">テキスト<select class="title form-select"><option value="">区分・科目・学年を選択してください</option></select></label>`;
 $("items").appendChild(d);
 const refresh=()=>{const l=d.querySelector(".level").value,s=d.querySelector(".subject").value,g=d.querySelector(".grade").value;const list=TEXTBOOKS.filter(b=>b[0]===l&&b[1]===s&&(b[2]===g||b[2]==="全学年"||g==="全学年"));d.querySelector(".title").innerHTML='<option value="">選択してください</option>'+list.map(b=>`<option>${esc(b[3])}</option>`).join("")};
 d.querySelectorAll("select:not(.title)").forEach(x=>x.onchange=refresh);d.querySelector(".remove").onclick=()=>{d.remove();renumber()};refresh();
}
function renumber(){[...$("items").children].forEach((d,i)=>d.querySelector(".item-head strong").textContent="テキスト "+(i+1))}

$("preview").onclick=()=>{
 const sid=$("studentId").value.trim(),name=$("studentName").value.trim(),email=$("email").value.trim(),notes=$("notes").value.trim();
 if(!/^\d+$/.test(sid)){alert("生徒番号を数字で入力してください。");return}
 if(!name){alert("生徒氏名を入力してください。");return}
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){alert("メールアドレスの形式が正しくありません。");return}
 const items=[...$("items").children].map(d=>({level:d.querySelector(".level").value,subject:d.querySelector(".subject").value,grade:d.querySelector(".grade").value,title:d.querySelector(".title").value,quantity:Number(d.querySelector(".qty").value)}));
 if(!items.length||items.some(x=>!x.title||!Number.isInteger(x.quantity)||x.quantity<1)){alert("購入するテキストと数量を確認してください。");return}
 current={studentId:sid,studentName:name,email,notes,items};
 $("previewBox").innerHTML=`<div class="preview"><p><b>生徒番号</b><br>${esc(sid)}</p><p><b>生徒氏名</b><br>${esc(name)}</p><hr><b>購入テキスト</b>${items.map(x=>`<p>・${esc(x.title)} × ${x.quantity}<br><small>${esc(x.level)} / ${esc(x.subject)}</small></p>`).join("")}<hr><p><b>連絡事項</b><br>${esc(notes||"なし")}</p><p><b>確認メール</b><br>${esc(email)}</p></div>`;
 show("previewPage");
};

$("submit").onclick=async()=>{
 if(!current)return;
 $("submit").disabled=true;
 $("loading").classList.remove("hidden");

 try{
   await fetch(GAS_URL,{
     method:"POST",
     mode:"no-cors",
     headers:{"Content-Type":"text/plain;charset=utf-8"},
     body:JSON.stringify({...current,action:"purchase"})
   });
   show("completePage");
 }catch(e){
   alert("通信エラーが発生しました。時間をおいて再度お試しください。");
   $("submit").disabled=false;
   $("loading").classList.add("hidden");
 }
};

renderBooks();
