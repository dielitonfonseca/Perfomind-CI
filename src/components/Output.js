import React from 'react';

function Output({ data }) {
  const copiarTexto = () => {
    navigator.clipboard.writeText(data).then(() => {
      alert('Texto copiado para a área de transferência!');
    });
  };

  const compartilharTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(data)}`;
    window.open(url, '_blank');
    alert('Compartilhado via Telegram!');
  };

  return (
    <div className="output">
      <h3>Resultado ✅</h3>
      <pre id="resultado">{data}</pre>
      <button onClick={copiarTexto}>Copiar para área de transferência 📋</button>
      <button onClick={compartilharTelegram}>Compartilhar no Telegram 📲</button>
    </div>
  );
}

export default Output;