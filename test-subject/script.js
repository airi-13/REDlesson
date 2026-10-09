const GAS_URL=RED.GAS_URL;
const subjects=["英語","数学","国語","理科","社会"];
const $=id=>document.getElementById(id);
$("subjects").innerHTML=subjects.map(s=>'<label class="check"><input type="checkbox" value="'+s+'">'+s+'</label>').join("");
let current=null;
const esc=RED.escapeHtml;

$("form").addEventListener("submit",e=>{
  e.preventDefault();
  $("error").textContent="";

  const id=$("studentId").value.trim();
  const name=$("studentName").value.trim();
  const count=$("normalCount").value;
  const email=$("email").value.trim();
  const selected=[...document.querySelectorAll("#subjects input:checked")].map(x=>x.value);
  const purchase=document.querySelector('input[name="purchase"]:checked').value;

  if(!/^\d+$/.test(id)||!name||!count||!selected.length||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)){
    $("error").textContent="必須項目を正しく入力してください。";
    return;
  }

  if(selected.length < Number(count)){
    $("error").textContent="通常授業で受講している教科は全て選択してください";
    return;
  }

  current={
    action:"test_subject",
    studentId:id,
    studentName:name,
    normalSubjectCount:Number(count),
    subjects:selected,
    textbookPurchase:purchase,
    notes:$("notes").value.trim(),
    email
  };

  $("summary").innerHTML=
    '<p><b>生徒番号</b><br>'+esc(id)+'</p>'+
    '<p><b>氏名</b><br>'+esc(name)+'</p>'+
    '<p><b>通常授業受講教科数</b><br>'+count+'教科</p>'+
    '<p><b>テスト対策受講希望科目</b><br>'+selected.join("、")+'</p>'+
    '<p><b>テキスト追加購入</b><br>'+purchase+'</p>'+
    '<p><b>連絡事項</b><br>'+esc(current.notes||"なし")+'</p>'+
    '<p><b>メールアドレス</b><br>'+esc(email)+'</p>';

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
    const registration = await RED.registerApplication(current);

    $("confirm").classList.add("hidden");
    $("success").classList.remove("hidden");
    $("purchaseLinkAfter").classList.toggle("hidden",current.textbookPurchase!=="あり");
      await RED.sendApplicationEmails(registration.requestId);
  }catch(e){
    alert(e.message || "申請の登録に失敗しました。時間をおいて再度お試しください。");
    $("submit").disabled=false;
    $("loading").classList.add("hidden");
  }
};