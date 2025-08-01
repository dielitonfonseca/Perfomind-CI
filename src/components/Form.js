// src/components/Form.js
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig';
import { collection, doc, setDoc, serverTimestamp, getDoc, updateDoc, increment } from 'firebase/firestore';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';
import SignatureCanvas from 'react-signature-canvas';

function Form() {
  const [numero, setNumero] = useState('');
  const [cliente, setCliente] = useState('');
  const [tecnicoSelect, setTecnicoSelect] = useState('');
  const [tecnicoManual, setTecnicoManual] = useState('');
  const [defeitoSelect, setDefeitoSelect] = useState('');
  const [reparoSelect, setReparoSelect] = useState('');
  const [peca, setPeca] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isSamsung] = useState(true);

  // Novos estados para o PDF (padronizado para VD)
  const [modelo, setModelo] = useState('');
  const [serial, setSerial] = useState('');
  const [dataVisita, setDataVisita] = useState('');
  const [tipoChecklist, setTipoChecklist] = useState('PREENCHIDO');

  // Novos estados para Atendimento Garantia e Orçamento
  const [atendimentoGarantia, setAtendimentoGarantia] = useState(false);
  const [orcamentoAprovado, setOrcamentoAprovado] = useState(false);
  const [valorAprovado, setValorAprovado] = useState('');
  const [valorPago, setValorPago] = useState('');
  const [reparo1stVisit, setReparo1stVisit] = useState(false);

  const sigCanvas = useRef(null);
  const sigContainer = useRef(null);

  useEffect(() => {
    const tecnicoSalvo = localStorage.getItem('tecnico');
    if (tecnicoSalvo) {
      if (
        ['Dieliton Fonseca', 'Matheus Lindoso', 'Daniel Moraes', 'Yago Giordanni', 'Pablo Henrique', 'Wallysson Cesar', 'João Pedro', 'Claudio Cris', 'Matheus Henrique'].includes(tecnicoSalvo)
      ) {
        setTecnicoSelect(tecnicoSalvo);
        setTecnicoManual('');
      } else {
        setTecnicoSelect('nao_achei');
        setTecnicoManual(tecnicoSalvo);
      }
    }
  }, []);

  useEffect(() => {
    if (tecnicoSelect === 'nao_achei') {
      localStorage.setItem('tecnico', tecnicoManual);
    } else {
      localStorage.setItem('tecnico', tecnicoSelect);
    }
  }, [tecnicoSelect, tecnicoManual]);

  useEffect(() => {
    function resizeCanvas() {
      if (sigCanvas.current && sigContainer.current) {
        const canvas = sigCanvas.current.getCanvas();
        const containerWidth = sigContainer.current.offsetWidth;
        canvas.width = containerWidth;
        sigCanvas.current.clear();
      }
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const validarNumero = (num) => {
    const padraoSamsung = /^417\d{7}$/;
    return padraoSamsung.test(num);
  };

  const limparFormulario = () => {
    setNumero('');
    setCliente('');
    setDefeitoSelect('');
    setReparoSelect('');
    setPeca('');
    setObservacoes('');
    setModelo('');
    setSerial('');
    setDataVisita('');
    setTipoChecklist('PREENCHIDO');
    setAtendimentoGarantia(false);
    setOrcamentoAprovado(false);
    setValorAprovado('');
    setValorPago('');
    setReparo1stVisit(false);
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
  };

  const updateCarryInStats = async (valorPago, valorAprovado, oldValorPago = 0, oldValorAprovado = 0) => {
    const today = new Date();
    const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

    const valorPagoDiff = parseFloat(valorPago) - parseFloat(oldValorPago);
    const valorAprovadoDiff = parseFloat(valorAprovado) - parseFloat(oldValorAprovado);

    const dailyStatsRef = doc(db, 'carryIn', dateString);
    await setDoc(dailyStatsRef, {
      totalPago: increment(valorPagoDiff),
      totalAprovado: increment(valorAprovadoDiff),
      lastUpdate: serverTimestamp()
    }, { merge: true });
  };

  const updateFirstVisitStats = async () => {
    const today = new Date();
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    const weekString = `${startOfWeek.getFullYear()}-${startOfWeek.getMonth() + 1}-${startOfWeek.getDate()}`;
    const firstVisitDocRef = doc(db, 'firstVisit', weekString);

    await setDoc(firstVisitDocRef, {
      count: increment(1),
      lastUpdate: serverTimestamp(),
    }, { merge: true });
  };

  const updateWarrantyStats = async () => {
    const today = new Date();
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    const weekString = `${startOfWeek.getFullYear()}-${startOfWeek.getMonth() + 1}-${startOfWeek.getDate()}`;
    const firstVisitDocRef = doc(db, 'firstVisit', weekString);

    await setDoc(firstVisitDocRef, {
      totalGarantia: increment(1),
      lastUpdate: serverTimestamp(),
    }, { merge: true });
  };

  const handleGarantiaChange = (e) => {
    setAtendimentoGarantia(e.target.checked);
    if (e.target.checked) {
      setOrcamentoAprovado(false);
    }
  };

  const handleOrcamentoChange = (e) => {
    setOrcamentoAprovado(e.target.checked);
    if (e.target.checked) {
      setAtendimentoGarantia(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const tecnicoFinal = (tecnicoSelect === 'nao_achei' ? tecnicoManual : tecnicoSelect).trim();
    const numeroOS = numero.trim();
    // const clienteNome = cliente.trim(); // Mantendo a variável para uso no objeto 'osData'

    if (numeroOS && !validarNumero(numeroOS)) {
      alert(`Número de OS inválido. O formato esperado é Samsung (417XXXXXXX).`);
      return;
    }

    if (!tecnicoFinal) {
      alert("Preencha o campo obrigatório: Técnico.");
      return;
    }
    
    // Validação para o nome do cliente foi removida conforme sua solicitação
    // if (!clienteNome) {
    //   alert("Preencha o campo de cliente.");
    //   return;
    // }

    try {
      const today = new Date();
      const dateStringFirebase = today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');
      
      const dateStringBr = String(today.getDate()).padStart(2, '0') + '/' +
        String(today.getMonth() + 1).padStart(2, '0') + '/' +
        today.getFullYear();

      const tecnicoDocRef = doc(db, 'ordensDeServicoCI', tecnicoFinal);
      await setDoc(tecnicoDocRef, { nome: tecnicoFinal }, { merge: true });

      const osPorDataCollectionRef = collection(tecnicoDocRef, 'osPorData');
      const dataDocRef = doc(osPorDataCollectionRef, dateStringFirebase);
      await setDoc(dataDocRef, { data: dateStringBr }, { merge: true });

      const osDocRef = doc(collection(dataDocRef, 'Samsung'), numeroOS || `OS_${Date.now()}`);
      
      let oldValorAprovado = 0;
      let oldValorPago = 0;

      const osDoc = await getDoc(osDocRef);
      if (osDoc.exists() && orcamentoAprovado) {
        const osDataOld = osDoc.data();
        oldValorAprovado = osDataOld.valorAprovado || 0;
        oldValorPago = osDataOld.valorPago || 0;
      }

      const osData = {
        numeroOS: numeroOS,
        cliente: cliente, // Usa o estado 'cliente' que pode ser uma string vazia
        tecnico: tecnicoFinal,
        tipoOS: 'samsung',
        defeito: defeitoSelect,
        reparo: reparoSelect,
        pecaSubstituida: peca,
        observacoes: observacoes,
        dataGeracao: serverTimestamp(),
        dataGeracaoLocal: dateStringBr,
        atendimentoGarantia,
        orcamentoAprovado,
        reparo1stVisit: atendimentoGarantia ? reparo1stVisit : false,
      };

      if (orcamentoAprovado) {
        osData.valorAprovado = parseFloat(valorAprovado);
        osData.valorPago = parseFloat(valorPago);
        await updateCarryInStats(osData.valorPago, osData.valorAprovado, oldValorPago, oldValorAprovado);
      }

      await setDoc(osDocRef, osData, { merge: true });

      if (atendimentoGarantia) {
        await updateWarrantyStats();
        if (reparo1stVisit) {
          await updateFirstVisitStats();
        }
      }

      console.log('Ordem de serviço cadastrada no Firebase com sucesso!');
      alert('Ordem de serviço enviada com sucesso!');
    } catch (e) {
      console.error("Erro ao adicionar documento: ", e);
      alert('Erro ao cadastrar ordem de serviço no Firebase. Verifique o console para mais detalhes.');
    }
  };

  const preencherPDF = async () => {
    let baseFileName = `/Checklist DTV_IH41_${tipoChecklist}.pdf`;
    const tipoAparelho = 'VD';

    try {
      const existingPdfBytes = await fetch(baseFileName).then(res => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const page = pdfDoc.getPages()[0];
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const drawText = (text, x, y, size = 10) => {
        page.drawText(String(text), {
          x,
          y,
          size,
          font,
          color: rgb(0, 0, 0)
        });
      };

      let pngImage = null;
      if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
        const assinaturaDataUrl = sigCanvas.current.getCanvas().toDataURL('image/png');
        pngImage = await pdfDoc.embedPng(assinaturaDataUrl);
      } else {
        console.log("Canvas de assinatura vazio. Assinatura não será adicionada ao PDF.");
      }

      const tecnicoFinal = (tecnicoSelect === 'nao_achei' ? tecnicoManual : tecnicoSelect).trim();
      const defeitoFinal = defeitoSelect;
      const reparoFinal = reparoSelect;

      const textoObservacoes = `Observações: ${observacoes}`;
      const textoDefeito = isSamsung ? `Código de Defeito: ${defeitoFinal}` : `Defeito: ${defeitoFinal}`;
      const textoReparo = isSamsung ? `Código de Reparo: ${reparoFinal}` : `Peça necessária: ${reparoFinal}`;

      const offset = 10;

      let dataFormatada = '';
      if (dataVisita) {
        const [ano, mes, dia] = dataVisita.split('-');
        dataFormatada = `${dia}     ${mes}      ${ano}`;
      }

      if (tipoAparelho === 'VD') {
        drawText(cliente, 92, height - 80);
        drawText(modelo, 92, height - 94);
        drawText(serial, 420, height - 80);
        drawText(numero, 420, height - 65);
        drawText(dataFormatada, 420, height - 93);
        drawText(tecnicoFinal, 120, height - 800);

        drawText(textoDefeito, 70, height - 757);
        drawText(textoReparo, 70, height - 757 - offset);
        drawText(textoObservacoes, 70, height - 757 - (offset * 2));

        if (pngImage) {
          page.drawImage(pngImage, {
            x: 390,
            y: height - 820,
            width: 150,
            height: 40
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const nomeArquivo = numero?.trim() || 'Checklist';
      saveAs(blob, `${nomeArquivo}.pdf`);
      alert("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao carregar ou preencher o PDF:", error);
      alert("Erro ao gerar o PDF. Verifique se o arquivo base está disponível para o tipo de aparelho e checklist selecionados.");
    }
  };

  return (
    <>
      <form id="osForm" onSubmit={handleSubmit}>
        <label htmlFor="numero">Número de Ordem de Serviço:</label>
        <input
          type="text"
          id="numero"
          placeholder={'Ex: 4171234567'}
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
        />

        <label htmlFor="cliente">Nome do cliente:</label>
        <input
          type="text"
          id="cliente"
          placeholder="Ex: Fulano de tal"
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          // O atributo 'required' foi removido
        />

        <label htmlFor="tecnicoSelect">Nome do técnico:</label>
        <select
          id="tecnicoSelect"
          value={tecnicoSelect}
          onChange={(e) => setTecnicoSelect(e.target.value)}
        >
          <option value="">Selecione um técnico</option>
          <option value="Dieliton Fonseca">Dieliton 😎</option>
          <option value="Matheus Lindoso">Matheus Lindoso</option>
          <option value="Claudio Cris">Claudio Cris</option>
          <option value="Wallysson Cesar ">Wallysson Cesar</option>
          <option value="João Pedro">João Pedro</option>
          <option value="Pablo Henrique">Pablo Henrique</option>
          <option value="Matheus Henrique">Matheus Henrique</option>
          <option value="Daniel Moraes">Daniel</option>
          <option value="Yago Giordanni">Yago Giordanni</option>
          <option value="nao_achei">Não achei a opção certa</option>
        </select>

        <label
          htmlFor="tecnicoManual"
          className={tecnicoSelect === 'nao_achei' ? '' : 'hidden'}
        >
          Ou digite o nome do técnico:
        </label>
        <input
          type="text"
          id="tecnicoManual"
          placeholder="Ex: Fulano de Tal"
          className={tecnicoSelect === 'nao_achei' ? '' : 'hidden'}
          value={tecnicoManual}
          onChange={(e) => setTecnicoManual(e.target.value)}
        />

        {/* Checkboxes de Atendimento e Orçamento */}
        <div style={{ marginTop: '20px' }}>
          <label className="checkbox-container">
            <input type="checkbox" checked={atendimentoGarantia} onChange={handleGarantiaChange} />
            Atendimento Garantia?
          </label>
          <label className="checkbox-container">
            <input type="checkbox" checked={orcamentoAprovado} onChange={handleOrcamentoChange} />
            Orçamento aprovado?
          </label>
        </div>

        {/* Campos de Orçamento Condicionais */}
        {orcamentoAprovado && (
          <div style={{ marginTop: '10px' }}>
            <label htmlFor="valorAprovado">Valor Aprovado:</label>
            <input
              type="number"
              id="valorAprovado"
              placeholder="Ex: 500"
              value={valorAprovado}
              onChange={(e) => setValorAprovado(e.target.value)}
            />
            <label htmlFor="valorPago">Valor Pago:</label>
            <input
              type="number"
              id="valorPago"
              placeholder="Ex: 500"
              value={valorPago}
              onChange={(e) => setValorPago(e.target.value)}
            />
          </div>
        )}

        {/* Checkbox de Reparo 1st Visit Condicional */}
        {atendimentoGarantia && (
          <div style={{ marginTop: '10px' }}>
            <label className="checkbox-container">
              <input type="checkbox" checked={reparo1stVisit} onChange={e => setReparo1stVisit(e.target.checked)} />
              Reparo 1st Visit?
            </label>
          </div>
        )}

        <label htmlFor="defeitoSelect">Código de Defeito:</label>
        <select
          id="defeitoSelect"
          value={defeitoSelect}
          onChange={(e) => setDefeitoSelect(e.target.value)}
        >
          <option value="">Selecione o defeito</option>
          <option value="AXP">AXP - Uso inadequado do consumidor (VD)</option>
          <option value="AXX">AXX - Outro problema</option>
          <option value="CMK">CMK - Tela danificada pelo consumidor</option>
          <option value="AA1">AA1 - Não Liga</option>
          <option value="AA2">AA2 - Desliga sozinho</option>
          <option value="AA3">AA3 - Liga/Desliga aleatoriamente</option>
          <option value="AA4">AA4 - Desliga intermitente</option>
          <option value="AA5">AA5 - Fonte de alimentação instável</option>
          <option value="AB1">AB1 - Não indica funções no painel</option>
          <option value="AB8">AB8 - Lampada/LED não funciona</option>
          <option value="AM3">AM3 - Controle remoto não funciona</option>
          <option value="AN4">AN4 - Wi-Fi não funciona</option>
          <option value="AB2">AB2 - Display intermitente</option>
          <option value="AB3">AB3 - Sujeira no display</option>
          <option value="AE1">AE1 - Sem imagem</option>
          <option value="AE2">AE2 - Imagem intermitente</option>
          <option value="AE3">AE3 - Linhas horizontais</option>
          <option value="AE4">AE4 - Linhas verticais</option>
          <option value="AEN">AEN - Imagem distorcida</option>
          <option value="AG1">AG1 - Sem som</option>
          <option value="AG2">AG2 - Som intermitente</option>
          <option value="AG4">AG4 - Som distorcido</option>
          <option value="TLA">AG2 - WiFi não funciona</option>
          <option value="nao_achei">Não achei a opção certa</option>
        </select>

        <label htmlFor="reparoSelect">Código de Reparo:</label>
        <select
          id="reparoSelect"
          value={reparoSelect}
          onChange={(e) => setReparoSelect(e.target.value)}
        >
          <option value="">Selecione o reparo</option>
          <option value="X09">X09 - Orçamento recusado!</option>
          <option value="A04">A04 - Troca de PCB</option>
          <option value="A10">A10 - Troca do LCD</option>
          <option value="A01">A01 - Componente Elétrico</option>
          <option value="A02">A02 - Componente Mecânico</option>
          <option value="A03">A03 - Substituição de item cosmético</option>
          <option value="A17">A17 - Substituição do sensor</option>
          <option value="X01">X01 - NDF Nenhum defeito encontrado</option>
          <option value="A15">A15 - Troca de compressor</option>
          <option value="A17">A17 - Troca do sensor</option>
          <option value="A20">A20 - Troca de acessório (ex. controle)</option>
          <option value="nao_achei">Não achei a opção certa</option>
        </select>

        <label htmlFor="peca">Peça substituída:</label>
        <input
          type="text"
          id="peca"
          placeholder="Ex: Placa principal"
          value={peca}
          onChange={(e) => setPeca(e.target.value)}
        />

        <label htmlFor="observacoes">Observações:</label>
        <textarea
          id="observacoes"
          rows="4"
          placeholder="Ex: Pagamento pendente, Cliente aguarda nota fiscal, etc"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        ></textarea>

        <h2>Dados para o Checklist</h2>
        <label htmlFor="tipoChecklist">Tipo de Checklist:</label>
        <select name="tipoChecklist" onChange={(e) => setTipoChecklist(e.target.value)} value={tipoChecklist}>
          <option value="PREENCHIDO">Reparo Normal</option>
          <option value="EXCLUSAO">Exclusão de Garantia</option>
          <option value="NDF">Sem Defeito (NDF)</option>
        </select>

        <label htmlFor="modelo">Modelo:</label>
        <input name="modelo" placeholder="Modelo do Aparelho" onChange={(e) => setModelo(e.target.value)} value={modelo} />

        <label htmlFor="serial">Serial:</label>
        <input name="serial" placeholder="Número de Série" onChange={(e) => setSerial(e.target.value)} value={serial} />

        <label htmlFor="dataVisita">Data da Visita:</label>
        <input name="dataVisita" type="date" onChange={(e) => setDataVisita(e.target.value)} value={dataVisita} />

        <div className="signature-section-container" ref={sigContainer}>
          <p className="signature-label">Assinatura do Cliente:</p>
          <SignatureCanvas
            penColor="black"
            canvasProps={{
              height: 100,
              className: 'sigCanvas',
              style: {
                backgroundColor: 'white',
                border: '1px solid #444',
                borderRadius: '4px'
              }
            }}
            ref={sigCanvas}
          />
          <button type="button" onClick={() => sigCanvas.current.clear()} className="clear-signature-button">
            Limpar Assinatura
          </button>
        </div>
        <button type="button" onClick={preencherPDF} style={{ marginTop: '10px' }}>Gerar Checklist PDF!</button>

        <button type="submit">Enviar ao servidor</button>
        <button type="button" onClick={limparFormulario} style={{ marginTop: '10px' }}>Limpar Formulário</button>
      </form>
    </>
  );
}

export default Form;