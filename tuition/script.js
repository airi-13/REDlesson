(() => {
"use strict";

const CONFIG = {
  middle12: {
    label: "中1・2",
    lesson: 9900,
    test: 4500,
    course: 12200,
    pack: { name: "週4パック", monthly: 29700, maxLessons: 4 },
    unlimited: 47520
  },
  middle3high1: {
    label: "中3・高1",
    lesson: 11800,
    test: 5800,
    course: 14700,
    pack: { name: "週6パック", monthly: 39600, maxLessons: 6 },
    unlimited: 56640
  }
};

let grade = "middle12";
let subjects = 2;
let lessons = 2;
let testSubjects = 2;

const yen = value => value.toLocaleString("ja-JP") + "円";

function update() {
  const c = CONFIG[grade];

  // 教科数以上の週コマ数・テスト対策教科数になるよう自動調整
  lessons = Math.max(lessons, subjects);
  testSubjects = Math.max(testSubjects, subjects);

  // 通常料金の年間授業料
  const regularAnnual =
    c.lesson * lessons * 11 +
    c.course * subjects * 3 +
    c.test * testSubjects * 3;

  // 通常料金の月額表示
  // 「通常授業料」～「通常授業料＋テスト対策料金」で表示
  const regularMonthlyMin = c.lesson * lessons;
  const regularMonthlyMax =
    regularMonthlyMin + c.test * testSubjects;

  document.querySelector("#subjectCount").textContent = subjects;
  document.querySelector("#lessonCount").textContent = lessons;
  document.querySelector("#testSubjectCount").textContent = testSubjects;
  document.querySelector("#regularTestLessonRule").textContent = "無制限";
  document.querySelector("#regularTestSubjectRule").innerHTML = testSubjects + "教科<br>（1科目毎に追加料金）";
  document.querySelector("#packTestLessonRule").textContent = "無制限";
  document.querySelector("#unlimitedTestLessonRule").textContent = "無制限";

  // お得なプラン案内
  // 判定は「年間授業料」で行います。
  const packAnnual = c.pack.monthly * 12;
  const unlimitedAnnual = c.unlimited * 12;

  function calculateRegularAnnual(extraLessons, extraTestSubjects) {
    return c.lesson * (lessons + extraLessons) * 11 +
      c.course * subjects * 3 +
      c.test * (testSubjects + extraTestSubjects) * 3;
  }

  function getExtraLessonsFor(targetAnnual) {
    for (let n = 0; n <= 10 - lessons; n++) {
      if (calculateRegularAnnual(n, 0) >= targetAnnual) return n;
    }
    return null;
  }

  function getExtraTestSubjectsFor(targetAnnual) {
    for (let n = 0; n <= 5 - testSubjects; n++) {
      if (calculateRegularAnnual(0, n) >= targetAnnual) return n;
    }
    return null;
  }

  function makeRecommendation(targetAnnual, name) {
    const currentAnnual = calculateRegularAnnual(0, 0);

    if (currentAnnual >= targetAnnual) {
      return '<div class="recommendation-good">' +
        '<div class="recommendation-good-label">今のプランなら</div>' +
        '<strong>' + name + 'がお得！</strong>' +
        '</div>';
    }

    const extraLessons = getExtraLessonsFor(targetAnnual);
    const extraTestSubjects =
      name === "通い放題"
        ? Math.max(0, 4 - testSubjects)
        : getExtraTestSubjectsFor(targetAnnual);

    return '<div class="recommendation-content">' +
      '' +
      '<div class="recommendation-option">' +
        '<span class="recommendation-label">通常授業</span>' +
        '<strong>あと <b>' + (extraLessons === null ? '—' : extraLessons) + '</b> コマ／週</strong>' +
      '</div>' +
      '<div class="recommendation-or">または</div>' +
      '<div class="recommendation-option">' +
        '<span class="recommendation-label">テスト対策教科</span>' +
        '<strong>あと <b>' + (extraTestSubjects === null ? '—' : extraTestSubjects) + '</b> 教科</strong>' +
      '</div>' +
      '<div class="recommendation-conclusion">→ ' + name + 'がお得！</div>' +
      '</div>';
  }

  document.querySelector("#packRecommendation").innerHTML =
    makeRecommendation(packAnnual, c.pack.name);

  document.querySelector("#unlimitedRecommendation").innerHTML =
    makeRecommendation(unlimitedAnnual, "通い放題");

  // プラン比較
  document.querySelector("#rulesPackName").textContent = c.pack.name;
  document.querySelector("#regularSubjectRule").textContent =
    subjects + "教科";
  document.querySelector("#regularLessonRule").textContent =
    "週" + lessons + "コマ";
  document.querySelector("#packSubjectRule").textContent = "3教科まで";
  document.querySelector("#packLessonRule").textContent =
    "週" + c.pack.maxLessons + "コマまで";

  document.querySelector("#regularMonthly").textContent =
    yen(regularMonthlyMin) + "～" + yen(regularMonthlyMax);
  document.querySelector("#packMonthly").textContent =
    yen(c.pack.monthly);
  document.querySelector("#unlimitedMonthly").textContent =
    yen(c.unlimited);

  document.querySelector("#regularAnnual").textContent =
    yen(regularAnnual);
  document.querySelector("#packAnnual").textContent =
    yen(c.pack.monthly * 12);
  document.querySelector("#unlimitedAnnual").textContent =
    yen(c.unlimited * 12);

  // ボタンの有効・無効
  document.querySelector("#subjectMinus").disabled = subjects <= 1;
  document.querySelector("#subjectPlus").disabled = subjects >= 5;

  document.querySelector("#lessonMinus").disabled = lessons <= subjects;
  document.querySelector("#lessonPlus").disabled = lessons >= 10;

  document.querySelector("#testSubjectMinus").disabled =
    testSubjects <= subjects;
  document.querySelector("#testSubjectPlus").disabled =
    testSubjects >= 5;

  document.querySelectorAll(".grade-btn").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.grade === grade
    );
  });
}

document.querySelectorAll(".grade-btn").forEach(button => {
  button.addEventListener("click", () => {
    grade = button.dataset.grade;
    update();
  });
});

document.querySelector("#subjectMinus").addEventListener("click", () => {
  if (subjects > 1) {
    subjects--;
    update();
  }
});

document.querySelector("#subjectPlus").addEventListener("click", () => {
  if (subjects < 5) {
    subjects++;
    update();
  }
});

document.querySelector("#lessonMinus").addEventListener("click", () => {
  if (lessons > subjects) {
    lessons--;
    update();
  }
});

document.querySelector("#lessonPlus").addEventListener("click", () => {
  if (lessons < 10) {
    lessons++;
    update();
  }
});

document.querySelector("#testSubjectMinus").addEventListener("click", () => {
  if (testSubjects > subjects) {
    testSubjects--;
    update();
  }
});

document.querySelector("#testSubjectPlus").addEventListener("click", () => {
  if (testSubjects < 5) {
    testSubjects++;
    update();
  }
});

update();
})();