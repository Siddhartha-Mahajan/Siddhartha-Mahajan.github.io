(function(){
  "use strict";

  const root = document.documentElement;
  const progressBar = document.getElementById("reading-progress-bar");
  const copyButton = document.getElementById("copy-formula");
  const filterButtons = document.querySelectorAll("[data-filter]");
  const certificateRows = document.querySelectorAll(".certificate-table tbody tr");
  const sectionLinks = Array.from(document.querySelectorAll('.article-nav a[href^="#"]'));
  const sections = Array.from(document.querySelectorAll("[data-section]"));

  function updateReadingProgress(){
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    root.style.setProperty("--reading", `${(ratio * 100).toFixed(2)}%`);
    if(progressBar) progressBar.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
  }

  let progressQueued = false;
  window.addEventListener("scroll", function(){
    if(progressQueued) return;
    progressQueued = true;
    window.requestAnimationFrame(function(){
      updateReadingProgress();
      progressQueued = false;
    });
  }, {passive:true});
  updateReadingProgress();

  if(copyButton){
    copyButton.addEventListener("click", async function(){
      const value = copyButton.dataset.copyText || "";
      try{
        await navigator.clipboard.writeText(value);
        copyButton.textContent = "Copied";
        copyButton.classList.add("copied");
        window.setTimeout(function(){
          copyButton.textContent = "Copy formula";
          copyButton.classList.remove("copied");
        }, 1600);
      }catch(error){
        copyButton.textContent = "Select formula above";
      }
    });
  }

  filterButtons.forEach(function(button){
    button.addEventListener("click", function(){
      const filter = button.dataset.filter;
      filterButtons.forEach(function(item){
        item.classList.toggle("active", item === button);
      });
      certificateRows.forEach(function(row){
        const visible = filter === "all" || row.dataset.parity === filter;
        row.classList.toggle("filtered-out", !visible);
      });
    });
  });

  if("IntersectionObserver" in window && sections.length){
    const linkById = new Map(
      sectionLinks.map(function(link){ return [link.getAttribute("href").slice(1), link]; })
    );
    const visibleSections = new Map();
    const observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting) visibleSections.set(entry.target.id, entry.intersectionRatio);
        else visibleSections.delete(entry.target.id);
      });
      let activeId = "";
      let activeRatio = -1;
      visibleSections.forEach(function(ratio, id){
        if(ratio > activeRatio){
          activeRatio = ratio;
          activeId = id;
        }
      });
      sectionLinks.forEach(function(link){
        link.classList.toggle("active", link === linkById.get(activeId));
      });
    }, {rootMargin:"-15% 0px -68% 0px", threshold:[0, 0.05, 0.2, 0.5]});
    sections.forEach(function(section){ observer.observe(section); });
  }
})();
