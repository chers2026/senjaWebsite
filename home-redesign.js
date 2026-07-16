const button=document.querySelector('.menu');const nav=document.querySelector('nav');button?.addEventListener('click',()=>{const open=nav.classList.toggle('open');button.setAttribute('aria-expanded',String(open))});nav?.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{nav.classList.remove('open');button?.setAttribute('aria-expanded','false')}));

const galleryItems=[...document.querySelectorAll('[data-gallery-image]')];
const lightbox=document.querySelector('.lightbox');
const lightboxImage=lightbox?.querySelector('img');
const closeLightboxButton=lightbox?.querySelector('.lightbox-close');
let currentPhoto=0;
let galleryTrigger=null;

function showPhoto(index){
  if(!lightboxImage||!galleryItems.length)return;
  currentPhoto=(index+galleryItems.length)%galleryItems.length;
  const thumbnail=galleryItems[currentPhoto].querySelector('img');
  lightboxImage.src=galleryItems[currentPhoto].dataset.galleryImage;
  lightboxImage.alt=thumbnail?.alt||'Gallery photo';
}

function openLightbox(index){
  if(!lightbox)return;
  galleryTrigger=galleryItems[index];
  showPhoto(index);
  lightbox.hidden=false;
  document.body.classList.add('lightbox-open');
  closeLightboxButton?.focus();
}

function closeLightbox(){
  if(!lightbox||lightbox.hidden)return;
  lightbox.hidden=true;
  document.body.classList.remove('lightbox-open');
  galleryTrigger?.focus();
}

galleryItems.forEach((item,index)=>item.addEventListener('click',()=>openLightbox(index)));
lightbox?.querySelector('.lightbox-prev')?.addEventListener('click',()=>showPhoto(currentPhoto-1));
lightbox?.querySelector('.lightbox-next')?.addEventListener('click',()=>showPhoto(currentPhoto+1));
closeLightboxButton?.addEventListener('click',closeLightbox);
lightbox?.addEventListener('click',event=>{if(event.target===lightbox)closeLightbox()});
document.addEventListener('keydown',event=>{
  if(!lightbox||lightbox.hidden)return;
  if(event.key==='Escape')closeLightbox();
  if(event.key==='ArrowLeft')showPhoto(currentPhoto-1);
  if(event.key==='ArrowRight')showPhoto(currentPhoto+1);
});
