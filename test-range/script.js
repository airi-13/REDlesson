const GAS_URL="https://script.google.com/macros/s/AKfycby1q-1oxYwOgWsMgDaGvCDVg3BnTdZIeLmjrbFKMf3r53dD5DkU49D3SWXwgYxFpTo/exec";

const SCHOOLS=[
  "我孫子中学校","湖北中学校","布佐中学校","湖北台中学校","久寺家中学校","白山中学校",
  "我孫子第一小学校","我孫子第二小学校","我孫子第三小学校","我孫子第四小学校",
  "根戸小学校","並木小学校","高野山小学校","湖北小学校","湖北台東小学校","湖北台西小学校",
  "新木小学校","布佐小学校","布佐南小学校",
  "県立我孫子高等学校","県立我孫子東高等学校","私立我孫子二階堂高等学校","私立中央学院高等学校",
  "その他"
];

const GRADES=[
  "小学1年","小学2年","小学3年","小学4年","小学5年","小学6年",
  "中学1年","中学2年","中学3年","高校1年","高校2年","高校3年"
];

const PUBLISHERS={
  "英語":["東京書籍","開隆堂","三省堂","教育出版","光村図書","啓林館","その他"],
  "数学":["東京書籍","大日本図書","学校図書","教育出版","啓林館","数研出版","その他"],
  "国語":["東京書籍","教育出版","光村図書","三省堂","その他"],
  "理科":["東京書籍","大日本図書","学校図書","教育出版","啓林館","その他"],
  "社会":["東京書籍","教育出版","帝国書院","日本文教出版","山川出版社","その他"]
};

const subjects=["英語","数学","国語","理科","社会"];
const $=id=>document.getElementById(id);
let current=null;

$("school").innerHTML='<option value="">学校を選択してください</option>'+SCHOOLS.map(x=>'<option>'+esc(x)+'</option>').join("");
$("grade").innerHTML='<option value="">学年を選択してください</option>'+GRADES.map(x=>'<option>'+esc(x)+'</option>').join("");

function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}

function createRangeRow(subject,index){
  const row=document.createElement("div");
  row.className="range-row";
  row.innerHTML='<span class="range-label">P</span><input class="from" type="text" inputmode="numeric" maxlength="4" placeholder="開始"><span class="range-label">～ P</span><input class="to" type="text" inputmode="numeric" maxlength="4" placeholder="終了"><button class="remove-range" type="button" aria-label="範囲を削除">−</button>';
  const sanitize=()=>{row.querySelectorAll("input").forEach(i=>i.value=i.value.replace(/[^0-9]/g,""));};
  row.querySelectorAll("input").forEach(i=>i.addEventListener("input",sanitize));
  row.querySelector(".remove-range").addEventListener("click",()=>{row.remove();});
  return row;
}

function createSubject(subject){
  const block=document.createElement("section");
  block.className="subject-block";
  block.dataset.subject=subject;
  block.innerHTML='<div class="subject-head"><div class="subject-name">'+esc(subject)+'</div></div>'+
    '<div class="subject-body">'+
    '<div class="publisher-row"><label>教科書出版社<select class="publisher"><option value="">出版社を選択してください</option>'+PUBLISHERS[subject].map(x=>'<option>'+esc(x)+'</option>').join("")+'</select></label></div>'+
    '<div class="range-list"></div>'+
    '<button class="add-range" type="button" title="範囲を追加" aria-label="'+esc(subject)+'の範囲を追加">＋</button>'+
    '<p class="error subject-error"></p></div>';
  const list=block.querySelector(".range-list");
  list.appendChild(createRangeRow(subject,0));
  block.querySelector(".add-range").addEventListener("click",()=>list.appendChild(createRangeRow(subject,list.children.length)));
  return block;
}

subjects.forEach(s=>$("subjects").appendChild(createSubject(s)));

function collect(){
  const result=[];
  document.querySelectorAll(".subject-block").forEach(block=>{
    const subject=block.dataset.subject;
    const publisher=block.querySelector(".publisher").value.trim();
    const ranges=[...block.querySelectorAll(".range-row")].map(row=>({
      from:row.querySelector(".from").value.trim(),
      to:row.querySelector(".to").value.trim()
    })).filter(x=>x.from||x.to);
    if(publisher||ranges.length) result.push({subject,publisher,ranges});
  });
  return result;
}

function validate(){
  let ok=true;
  const clear=["studentId","studentName","school","grade","testDate"];
  clear.forEach(id=>$(id+"Error").textContent="");
  $("formError").textContent="";
  document.querySelectorAll(".subject-error").forEach(x=>x.textContent="");

  const sid=$("studentId").value.trim();
  if(!/^\d+$/.test(sid)){ $("studentIdError").textContent="生徒番号は半角数字で入力してください。";ok=false; }
  if(!$("studentName").value.trim()){ $("studentNameError").textContent="氏名を入力してください。";ok=false; }
  if(!$("school").value){ $("schoolError").textContent="学校名を選択してください。";ok=false; }
  if(!$("grade").value){ $("gradeError").textContent="学年を選択してください。";ok=false; }
  if(!$("testDate").value){ $("testDateError").textContent="テストの日付を選択してください。";ok=false; }

  document.querySelectorAll(".subject-block").forEach(block=>{
    const publisher=block.querySelector(".publisher").value.trim();
    const rows=[...block.querySelectorAll(".range-row")];
    const ranges=rows.map(row=>({from:row.querySelector(".from").value.trim(),to:row.querySelector(".to").value.trim()}));
    const used=publisher||ranges.some(x=>x.from||x.to);
    if(!used) return;
    if(!ranges.some(x=>x.from&&x.to)){block.querySelector(".subject-error").textContent="ページ範囲を1つ以上、P○～P○の形で入力してください。";ok=false;return;}
    if(ranges.some(x=>(x.from&&!x.to)||(!x.from&&x.to))){block.querySelector(".subject-error").textContent="開始ページと終了ページを両方入力してください。";ok=false;return;}
    if(ranges.some(x=>Number(x.from)>Number(x.to))){block.querySelector(".subject-error").textContent="ページ番号は開始ページ以下に終了ページを入力してください。";ok=false;}
  });

  if(subjects.some(s=>{const b=document.querySelector('.subject-block[data-subject="'+s+'"]');return ![...b.querySelectorAll(".range-row")].some(r=>r.querySelector(".from").value&&r.querySelector(".to").value)})){ $("formError").textContent="英語・数学・国語・理科・社会の5教科すべてにページ範囲を入力してください。";ok=false;}\n  if(!subjects.some(s=>{const b=document.querySelector('.subject-block[data-subject="'+s+'"]');return b.querySelector(".publisher").value||[...b.querySelectorAll(".range-row")].some(r=>r.querySelector(".from").value||r.querySelector(".to").value)})){
    $("formError").textContent="少なくとも1教科のテスト範囲を入力してください。";ok=false;
  }
  return ok;
}

$("rangeForm").addEventListener("submit",e=>{
  e.preventDefault();
  if(!validate()) return;
  current={
    action:"test_range",
    studentId:$("studentId").value.trim(),
    studentName:$("studentName").value.trim(),
    school:$("school").value,
    grade:$("grade").value,
    testDate:$("testDate").value,
    subjects:collect(),
    notes:$("notes").value.trim()
  };
  const html='<p><b>生徒番号</b><br>'+esc(current.studentId)+'</p>'+
    '<p><b>氏名</b><br>'+esc(current.studentName)+'</p>'+
    '<p><b>学校名</b><br>'+esc(current.school)+'</p>'+
    '<p><b>学年</b><br>'+esc(current.grade)+'</p>'+
    '<p><b>日時</b><br>'+esc(current.testDate)+'</p>'+
    current.subjects.map(x=>'<div class="subject-confirm"><b>'+esc(x.subject)+'</b><br>出版社：'+esc(x.publisher)+'<br>'+x.ranges.map(r=>'P'+esc(r.from)+'～P'+esc(r.to)).join("<br>")+'</div>').join("")+
    '<p><b>連絡事項</b><br>'+esc(current.notes||"なし")+'</p>';
  $("confirmationItems").innerHTML=html;
  $("rangeForm").classList.add("hidden");
  $("confirmation").classList.remove("hidden");
  window.scrollTo({top:0,behavior:"smooth"});
});

$("backButton").addEventListener("click",()=>{
  $("confirmation").classList.add("hidden");
  $("rangeForm").classList.remove("hidden");
  window.scrollTo({top:0,behavior:"smooth"});
});

$("submitButton").addEventListener("click",async()=>{
  if(!current)return;
  $("submitButton").disabled=true;
  $("loading").classList.remove("hidden");
  try{
    await fetch(GAS_URL,{
      method:"POST",
      mode:"no-cors",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(current)
    });
    $("confirmation").classList.add("hidden");
    $("success").classList.remove("hidden");
    window.scrollTo({top:0,behavior:"smooth"});
  }catch(e){
    $("loading").classList.add("hidden");
    $("submitButton").disabled=false;
    alert("通信エラーが発生しました。時間をおいて再度お試しください。");
  }
});
