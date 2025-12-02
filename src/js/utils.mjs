export async function loadTemplate(path){
  const file = await fetch(path);
  const result = await file.text();
  return result;
}

export function renderWithTemplate(template, parentElement) {
  parentElement.innerHTML = template;
}

export async function loadHeaderFooter(){
  const headerContent = await loadTemplate('../partials/header.html');
  const footerContent = await loadTemplate('../partials/footer.html');

  const header = document.getElementById('main-header');
  const footer = document.getElementById('main-footer');

  renderWithTemplate(headerContent, header);
  renderWithTemplate(footerContent, footer);
}