(() => {
"use strict";
const CONFIG={
middle12:{label:"中1・2",lesson:9900,test:4500,course:12200,pack:{name:"週4パック",monthly:29700,maxLessons:4},unlimited:47520},
middle3high1:{label:"中3・高1",lesson:11800,test:5800,course:14700,pack:{name:"週6パック",monthly:39600,maxLessons:6},unlimited:56640}
};
let grade="middle12",subjects=2,lessons=2,testSubjects=2;
const yen=n=>n.toLocaleString("ja-JP")+"円";
function update(){
 const c=CONFIG[grade];
 lessons=Math.max(lessons,subjects);
 testSubjects=Math.max(testSubjects,subjects);
 const regularAnnual=c.lesson*lessons*11+subjects*c.course*3+c.test*testSubjects*3;

 document.querySelector("#rulesPackName").textContent=c.pack.name;
 document.querySelector("#regularLessonRule").textContent="週"+lessons+"コマ";
 document.querySelector("#packLessonRule").textContent="週"+c.pack.maxLessons+"コマまで";
 document.querySelector("#regularSubjectRule").textContent=subjects+"教科";
 const packOk=lessons<=c.pack.maxLessons;
 document.querySelector("#subjectCount").textContent=subjects;
 document.querySelector("#lessonCount").textContent=lessons;
 document.querySelector("#testSubjectCount").textContent=testSubjects;
 const calc=(c)=>({lesson:c.lesson*lessons*11,course:c.course*subjects*3,test:c.test*testSubjects*3,total:c.lesson*lessons*11+c.course*subjects*3+c.test*testSubjects*3});
 const c12=calc(CONFIG.middle12), c31=calc(CONFIG.middle3high1);
 document.querySelector("#costLesson12").textContent=yen(c12.lesson);
 document.querySelector("#costLesson31").textContent=yen(c31.lesson);
 document.querySelector("#costCourse12").textContent=yen(c12.course);
 document.querySelector("#costCourse31").textContent=yen(c31.course);
 document.querySelector("#costTest12").textContent=yen(c12.test);
 document.querySelector("#costTest31").textContent=yen(c31.test);
 document.querySelector("#costTotal12").textContent=yen(c12.total);
 document.querySelector("#costTotal31").textContent=yen(c31.total);
 document.querySelector("#subjectMinus").disabled=subjects<=1;
 document.querySelector("#subjectPlus").disabled=subjects>=5;
 document.querySelector("#lessonMinus").disabled=lessons<=subjects;
 document.querySelector("#lessonPlus").disabled=lessons>=10;
 document.querySelector("#testSubjectMinus").disabled=testSubjects<=subjects;
 document.querySelector("#testSubjectPlus").disabled=testSubjects>=5;
 document.querySelectorAll(".grade-btn").forEach(b=>b.classList.toggle("active",b.dataset.grade===grade));
}
document.querySelectorAll(".grade-btn").forEach(b=>b.addEventListener("click",()=>{grade=b.dataset.grade;update()}));
document.querySelector("#subjectMinus").addEventListener("click",()=>{if(subjects>1){subjects--;update()}});
document.querySelector("#subjectPlus").addEventListener("click",()=>{if(subjects<5){subjects++;update()}});
document.querySelector("#lessonMinus").addEventListener("click",()=>{if(lessons>subjects){lessons--;update()}});
document.querySelector("#lessonPlus").addEventListener("click",()=>{if(lessons<10){lessons++;update()}});
document.querySelector("#testSubjectMinus").addEventListener("click",()=>{if(testSubjects>subjects){testSubjects--;update()}});
document.querySelector("#testSubjectPlus").addEventListener("click",()=>{if(testSubjects<5){testSubjects++;update()}});
update();
})();