(function(){
  const buttons = document.querySelectorAll('[data-circle-button]');
  const image = document.getElementById('selected-circle-image');
  const title = document.getElementById('selected-circle-title');
  const triples = [
    '012','037','038','046','047','056','058','136','137','146','148','157','158','236','238','247','248','256','257','345'
  ];
  function selectCircle(index){
    if(!image || !title) return;
    const number = String(index+1).padStart(2,'0');
    image.src = `assets/figures/n9_${number}.svg`;
    image.alt = `Certified unit circle ${number}, triple ${triples[index]}`;
    title.textContent = `Circle ${number}: triple ${triples[index]}`;
    buttons.forEach((button,i)=>button.classList.toggle('active', i===index));
  }
  buttons.forEach((button, index)=>button.addEventListener('click',()=>selectCircle(index)));
  selectCircle(0);
})();
