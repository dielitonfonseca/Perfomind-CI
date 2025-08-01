// src/components/KpisForm.js
import React, { useState } from 'react';
import { db } from '../firebaseConfig'; // Importa a instância do Firestore
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'; // Importa as funções necessárias do Firestore

function KpisForm() {
  const [week, setWeek] = useState('');
  const [ltpvdPercent, setLtpvdPercent] = useState('');
  const [ltpvdQtd, setLtpvdQtd] = useState('');
  const [ltpdaPercent, setLtpdaPercent] = useState('');
  const [ltpdaQtd, setLtpdaQtd] = useState('');
  const [exltpvdPercent, setExltpvdPercent] = useState('');
  const [exltpvdQtd, setExltpvdQtd] = useState('');
  const [exlptdaPercent, setExlptdaPercent] = useState('');
  const [exlrpdaQtd, setExlrpdaQtd] = useState('');
  const [ftcHappyCall, setFtcHappyCall] = useState('');
  // Removidos: const [ftcVd, setFtcVd] = useState('');
  // Removidos: const [ftcDa, setFtcDa] = useState('');
  const [firstVisitVd, setFirstVisitVd] = useState('');
  const [inHomeD1, setInHomeD1] = useState('');
  const [rrrVdPercent, setRrrVdPercent] = useState('');
  const [rrrVdQtd, setRrrVdQtd] = useState('');
  const [rrrDaPercent, setRrrDaPercent] = useState('');
  const [rrrDaQtd, setRrrDaQtd] = useState('');
  const [ssrVd, setSsrVd] = useState('');
  const [ssrDa, setSsrDa] = useState('');
  const [rnpsVd, setRnpsVd] = useState('');
  const [rnpsDa, setRnpsDa] = useState('');
  const [ecoRepairVd, setEcoRepairVd] = useState('');
  const [vendasStorePlus, setVendasStorePlus] = useState('');
  const [poInHomeD1, setPoInHomeD1] = useState('');
  const [treinamentos, setTreinamentos] = useState('');
  const [orcamento, setOrcamento] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!week) {
      alert('Por favor, preencha o campo WEEK.');
      return;
    }

    try {
      const kpiDocRef = doc(db, 'kpis', String(week));

      await setDoc(kpiDocRef, {
        week: parseFloat(week), // Converte para número
        'LTP VD %': parseFloat(ltpvdPercent),
        'LTP VD QTD': parseFloat(ltpvdQtd),
        'LTP DA %': parseFloat(ltpdaPercent),
        'LTP DA QTD': parseFloat(ltpdaQtd),
        'EX LTP VD %': parseFloat(exltpvdPercent),
        'EX LTP VD QTD': parseFloat(exltpvdQtd),
        'EX LPT DA %': parseFloat(exlptdaPercent),
        'EX LRP DA QTD': parseFloat(exlrpdaQtd),
        'FTC HAPPY CALL': parseFloat(ftcHappyCall),
        // Removidos: 'FTC VD': parseFloat(ftcVd),
        // Removidos: 'FTC DA': parseFloat(ftcDa),
        '1ST VISIT VD': parseFloat(firstVisitVd),
        'IN HOME D+1': parseFloat(inHomeD1),
        'RRR VD %': parseFloat(rrrVdPercent),
        'RRR VD QTD': parseFloat(rrrVdQtd),
        'RRR DA %': parseFloat(rrrDaPercent),
        'RRR DA QTD': parseFloat(rrrDaQtd),
        'SSR VD': parseFloat(ssrVd),
        'SSR DA': parseFloat(ssrDa),
        'R-NPS VD': parseFloat(rnpsVd),
        'R-NPS DA': parseFloat(rnpsDa),
        'ECO REPAIR VD': parseFloat(ecoRepairVd),
        'VENDAS STORE+': parseFloat(vendasStorePlus),
        'PO IN HOME D+1': parseFloat(poInHomeD1),
        'Treinamentos': parseFloat(treinamentos),
        'Orçamento': parseFloat(orcamento),
        timestamp: serverTimestamp(),
      }, { merge: true });

      alert('Dados de KPI salvos com sucesso no Firebase!');

      // Limpar formulário após o envio
      setWeek('');
      setLtpvdPercent('');
      setLtpvdQtd('');
      setLtpdaPercent('');
      setLtpdaQtd('');
      setExltpvdPercent('');
      setExltpvdQtd('');
      setExlptdaPercent('');
      setExlrpdaQtd('');
      setFtcHappyCall('');
      // Removidos: setFtcVd('');
      // Removidos: setFtcDa('');
      setFirstVisitVd('');
      setInHomeD1('');
      setRrrVdPercent('');
      setRrrVdQtd('');
      setRrrDaPercent('');
      setRrrDaQtd('');
      setSsrVd('');
      setSsrDa('');
      setRnpsVd('');
      setRnpsDa('');
      setEcoRepairVd('');
      setVendasStorePlus('');
      setPoInHomeD1('');
      setTreinamentos('');
      setOrcamento('');

    } catch (e) {
      console.error("Erro ao adicionar documento de ", e);
      alert('Erro ao salvar dados de KPI no Firebase. Verifique o console para mais detalhes.');
    }
  };

  return (
    <div className="form-container">
      <h3>Registro de KPIs</h3>
      <form onSubmit={handleSubmit}>
        <label htmlFor="week">WEEK:</label>
        <input
          type="number" // Mantido como number, mas será parseFloat ao salvar
          id="week"
          value={week}
          onChange={(e) => setWeek(e.target.value)}
          min="0"
          onWheel={(e) => e.target.blur()}
          required
        />
        <h2>LTP</h2>
        {/* LTP */}
        <label htmlFor="ltpvdPercent">LTP VD %:</label>
        <input type="text" id="ltpvdPercent" value={ltpvdPercent} onChange={(e) => setLtpvdPercent(e.target.value)} />

        <label htmlFor="ltpvdQtd">LTP VD QTD:</label>
        <input type="text" id="ltpvdQtd" value={ltpvdQtd} onChange={(e) => setLtpvdQtd(e.target.value)} />

        <label htmlFor="ltpdaPercent">LTP DA %:</label>
        <input type="text" id="ltpdaPercent" value={ltpdaPercent} onChange={(e) => setLtpdaPercent(e.target.value)} />

        <label htmlFor="ltpdaQtd">LTP DA QTD:</label>
        <input type="text" id="ltpdaQtd" value={ltpdaQtd} onChange={(e) => setLtpdaQtd(e.target.value)} />

        {/* EX LTP */}
        <label htmlFor="exltpvdPercent">EX LTP VD %:</label>
        <input type="text" id="exltpvdPercent" value={exltpvdPercent} onChange={(e) => setExltpvdPercent(e.target.value)} />

        <label htmlFor="exltpvdQtd">EX LTP VD QTD:</label>
        <input type="text" id="exltpvdQtd" value={exltpvdQtd} onChange={(e) => setExltpvdQtd(e.target.value)} />

        <label htmlFor="exlptdaPercent">EX LPT DA %:</label>
        <input type="text" id="exlptdaPercent" value={exlptdaPercent} onChange={(e) => setExlptdaPercent(e.target.value)} />

        <label htmlFor="exlrpdaQtd">EX LRP DA QTD:</label>
        <input type="text" id="exlrpdaQtd" value={exlrpdaQtd} onChange={(e) => setExlrpdaQtd(e.target.value)} />

        <h2>FTC</h2>

        {/* FTC HAPPY CALL (Novo campo unificado) */}
        <label htmlFor="ftcHappyCall">FTC HAPPY CALL:</label>
        <input type="text" id="ftcHappyCall" value={ftcHappyCall} onChange={(e) => setFtcHappyCall(e.target.value)} />
      
       <h2>Velocidade</h2>

        {/* Visitas */}
        <label htmlFor="firstVisitVd">1ST VISIT VD:</label>
        <input type="text" id="firstVisitVd" value={firstVisitVd} onChange={(e) => setFirstVisitVd(e.target.value)} />

        <label htmlFor="inHomeD1">IN HOME D+1:</label>
        <input type="text" id="inHomeD1" value={inHomeD1} onChange={(e) => setInHomeD1(e.target.value)} />

        


        <h2>Perfeição</h2>

        {/* RRR */}
        <label htmlFor="rrrVdPercent">RRR VD %:</label>
        <input type="text" id="rrrVdPercent" value={rrrVdPercent} onChange={(e) => setRrrVdPercent(e.target.value)} />

        <label htmlFor="rrrVdQtd">RRR VD QTD:</label>
        <input type="text" id="rrrVdQtd" value={rrrVdQtd} onChange={(e) => setRrrVdQtd(e.target.value)} />

        <label htmlFor="rrrDaPercent">RRR DA %:</label>
        <input type="text" id="rrrDaPercent" value={rrrDaPercent} onChange={(e) => setRrrDaPercent(e.target.value)} />

        <label htmlFor="rrrDaQtd">RRR DA QTD:</label>
        <input type="text" id="rrrDaQtd" value={rrrDaQtd} onChange={(e) => setRrrDaQtd(e.target.value)} />

        {/* ECO REPAIR VD (Novo Campo) */}
        <label htmlFor="ecoRepairVd">ECO REPAIR VD:</label>
        <input type="text" id="ecoRepairVd" value={ecoRepairVd} onChange={(e) => setEcoRepairVd(e.target.value)} />

        {/* SSR */}
        <label htmlFor="ssrVd">SSR VD:</label>
        <input type="text" id="ssrVd" value={ssrVd} onChange={(e) => setSsrVd(e.target.value)} />

        <label htmlFor="ssrDa">SSR DA:</label>
        <input type="text" id="ssrDa" value={ssrDa} onChange={(e) => setSsrDa(e.target.value)} />


        <h2>Peças</h2>
         {/* PO IN HOME D+1 (Novo Campo) */}
        <label htmlFor="poInHomeD1">PO IN HOME D+1:</label>
        <input type="text" id="poInHomeD1" value={poInHomeD1} onChange={(e) => setPoInHomeD1(e.target.value)} />


        <h2>Qualidade</h2>

        {/* R-NPS */}
        <label htmlFor="rnpsVd">R-NPS VD:</label>
        <input type="text" id="rnpsVd" value={rnpsVd} onChange={(e) => setRnpsVd(e.target.value)} />

        <label htmlFor="rnpsDa">R-NPS DA:</label>
        <input type="text" id="rnpsDa" value={rnpsDa} onChange={(e) => setRnpsDa(e.target.value)} />

        <h2>Outros</h2>

        {/* VENDAS STORE+ (Novo Campo) */}
        <label htmlFor="vendasStorePlus">VENDAS STORE+:</label>
        <input type="text" id="vendasStorePlus" value={vendasStorePlus} onChange={(e) => setVendasStorePlus(e.target.value)} />

        {/* Treinamentos (Novo Campo) */}
        <label htmlFor="treinamentos">TREINAMENTOS:</label>
        <input type="text" id="treinamentos" value={treinamentos} onChange={(e) => setTreinamentos(e.target.value)} />

        {/* Orçamento (Novo Campo) */}
        <label htmlFor="orcamento">ORÇAMENTO IH:</label>
        <input type="text" id="orcamento" value={orcamento} onChange={(e) => setOrcamento(e.target.value)} />

        <button type="submit">Enviar KPIs</button>
      </form>
    </div>
  );
}

export default KpisForm;