document.addEventListener("DOMContentLoaded",()=>{
  const logout=document.querySelector("[data-site-logout]");
  if(!logout) return;

  logout.addEventListener("click",()=>{
    sessionStorage.removeItem("redLessonAuth");
    window.location.href=logout.dataset.home || "../";
  });
});
