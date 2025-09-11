document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('fdt-tracking-form');
  const resultDiv = document.getElementById('fdt-tracking-result');

  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    
    const input = form.querySelector('input[name="fdt_barcode"]');
    const barcode = input.value.trim();

    if (!barcode) {
      alert("Veuillez entrer un code barre.");
      return;
    }

    resultDiv.classList.add('loading');
    resultDiv.innerHTML = "";

    fetch(fdt_ajax.ajax_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        action: 'fdt_tracking_search',
        barcode: barcode,
      }),
    })
    .then(response => response.text())
    .then(html => {
      resultDiv.classList.remove('loading');
      resultDiv.innerHTML = html;
    })
    .catch(error => {
      resultDiv.classList.remove('loading');
      resultDiv.innerHTML = `<div style="color:red;">Erreur: ${error.message}</div>`;
    });
  });
});
