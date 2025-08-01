// src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, query, orderBy, getDoc, doc, getDocs, limit } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Label, PieChart, Pie, Cell } from 'recharts';

const KPIChart = ({ data, title, dataKeys, meta, tooltipContent, yAxisDomain = [0, 'auto'] }) => {
  if (!data || data.length === 0) {
    return <p className="no-data-message">Nenhum dado de "{title}" encontrado para as últimas 8 semanas.</p>;
  }

  const renderMeta = (m, idx) => (
    <ReferenceLine key={idx} y={m.value} stroke={m.stroke} strokeDasharray="3 3">
      <Label
        value={m.label}
        position="right"
        fill={m.stroke}
        style={{ fontSize: '0.8em', textAnchor: 'start' }}
      />
    </ReferenceLine>
  );

  return (
    <div className="kpi-chart-container" style={{ textAlign: 'center' }}>
      <h3>{title} </h3>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 80, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
            <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={yAxisDomain} />
            <Tooltip content={tooltipContent} />
            <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
            {dataKeys.map((key, index) => (
              <Line
                key={key.dataKey}
                type="monotone"
                dataKey={key.dataKey}
                stroke={key.stroke}
                activeDot={{ r: 8 }}
                name={key.name}
              />
            ))}
            {meta && (Array.isArray(meta) ? meta.map(renderMeta) : renderMeta(meta, 0))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <div className="custom-tooltip">
        <p className="label">{label}</p>
        {payload.map((entry, index) => {
          const { name, value } = entry;
          let displayValue = value;

          if (name.includes('%') || name.includes('FTC') || name.includes('NPS') || name.includes('VISIT') || name.includes('IN HOME') || name.includes('REPAIR')) {
            displayValue = `${value}%`;
          }

          if (name.includes('LTP VD %') && dataPoint['LTP VD QTD'] !== undefined) {
            displayValue += ` (QTD: ${dataPoint['LTP VD QTD']})`;
          } else if (name.includes('LTP DA %') && dataPoint['LTP DA QTD'] !== undefined) {
            displayValue += ` (QTD: ${dataPoint['LTP DA QTD']})`;
          } else if (name.includes('EX LTP VD %') && dataPoint['EX LTP VD QTD'] !== undefined) {
            displayValue += ` (QTD: ${dataPoint['EX LTP VD QTD']})`;
          } else if (name.includes('EX LPT DA %') && dataPoint['EX LRP DA QTD'] !== undefined) {
            displayValue += ` (QTD: ${dataPoint['EX LRP DA QTD']})`;
          } else if (name.includes('RRR VD %') && dataPoint['RRR VD QTD'] !== undefined) {
            displayValue += ` (QTD: ${dataPoint['RRR VD QTD']})`;
          } else if (name.includes('RRR DA %') && dataPoint['RRR DA QTD'] !== undefined) {
            displayValue += ` (QTD: ${dataPoint['RRR DA QTD']})`;
          }

          return <p key={`item-${index}`}>{`${name}: ${displayValue}`}</p>;
        })}
      </div>
    );
  }
  return null;
};

// Tooltip customizado para o gráfico de pizza
const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip" style={{ backgroundColor: '#2a2a2a', padding: '10px', border: '1px solid #444', color: '#fff' }}>
        <p>{`${payload[0].name}: R$${payload[0].value.toFixed(2)}`}</p>
      </div>
    );
  }
  return null;
};

// Novo Tooltip para o gráfico de 1st Visit
const Custom1stVisitPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, value } = payload[0];
    return (
      <div className="custom-tooltip" style={{ backgroundColor: '#2a2a2a', padding: '10px', border: '1px solid #444', color: '#fff' }}>
        <p>{`${name}: ${value.toFixed(0)}`}</p>
      </div>
    );
  }
  return null;
};

function Dashboard() {
  const [kpiData, setKpiData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [carryInToday, setCarryInToday] = useState(0);
  const [carryInMonth, setCarryInMonth] = useState(0);
  const [firstVisitChartData, setFirstVisitChartData] = useState([]);
  const [metaOrcamento, setMetaOrcamento] = useState(0);
  const [totalOrcamentoPago, setTotalOrcamentoPago] = useState(0);
  const [firstVisitPieData, setFirstVisitPieData] = useState([]);

  const PIE_COLORS = ['#32a852', '#d9534f']; // Cores para o gráfico de orçamento
  const FIRST_VISIT_PIE_COLORS = ['#007bff', '#6c757d']; // Cores para o gráfico de 1st Visit

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribes = [];

    const kpisCollectionRef = collection(db, 'kpis');
    const qKpis = query(kpisCollectionRef, orderBy('week', 'asc'));
    const unsubscribeKpis = onSnapshot(qKpis, (snapshot) => {
      const fetchedKpis = snapshot.docs.map(doc => ({
        name: `W ${doc.data().week}`,
        week: doc.data().week,
        ...doc.data(),
      }));
      const sortedKpis = [...fetchedKpis].sort((a, b) => a.week - b.week);
      setKpiData(sortedKpis.slice(-8));
    }, (err) => {
      console.error("Erro no listener de KPIs:", err);
      setError("Erro ao carregar dados de KPIs. Verifique as permissões do Firebase.");
    });
    unsubscribes.push(unsubscribeKpis);

    const fetchCarryInStats = async () => {
      const today = new Date();
      const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
      const monthString = `${today.getFullYear()}-${today.getMonth() + 1}`;
      
      const todayDoc = await getDoc(doc(db, 'carryIn', dateString));
      if (todayDoc.exists()) {
        setCarryInToday(todayDoc.data().totalPago || 0);
      } else {
        setCarryInToday(0);
      }

      const monthDoc = await getDoc(doc(db, 'carryIn', monthString));
      if (monthDoc.exists()) {
        setCarryInMonth(monthDoc.data().totalPago || 0);
      } else {
        setCarryInMonth(0);
      }
    };
    fetchCarryInStats();
    
    const fetchFirstVisitChartData = async () => {
      const today = new Date();
      const dates = [];
      for (let i = 7; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - (i * 7));
        const weekString = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        dates.push(weekString);
      }
    
      const chartData = await Promise.all(dates.map(async (weekString) => {
        const docRef = doc(db, 'firstVisit', weekString);
        const docSnap = await getDoc(docRef);
        const data = docSnap.exists() ? docSnap.data() : { count: 0, totalGarantia: 0 };
        return {
          name: `W ${weekString.split('-')[1]}/${weekString.split('-')[2]}`,
          '1st Visit': data.count,
          'Total Garantia': data.totalGarantia,
          'Proporção (%)': data.totalGarantia > 0 ? (data.count / data.totalGarantia * 100).toFixed(2) : 0
        };
      }));
      setFirstVisitChartData(chartData);
    };

    fetchFirstVisitChartData();

    // Lógica para buscar dados para o gráfico de pizza de orçamento
    const fetchOrcamentoPieChartData = async () => {
      try {
        // Busca a meta da coleção 'metas'
        const metaDocRef = doc(db, 'metas', 'meta_orcamento_ci_vd');
        const metaDocSnap = await getDoc(metaDocRef);
        const metaValue = metaDocSnap.exists() ? metaDocSnap.data().meta : 0;
        setMetaOrcamento(metaValue);

        // Busca todos os documentos da coleção carryIn para somar o totalPago
        const carryInCollectionRef = collection(db, 'carryIn');
        const carryInSnapshot = await getDocs(carryInCollectionRef);
        let totalPaid = 0;
        carryInSnapshot.forEach(doc => {
          totalPaid += doc.data().totalPago || 0;
        });
        setTotalOrcamentoPago(totalPaid);
      } catch (e) {
        console.error("Erro ao buscar dados para o gráfico de pizza de orçamento: ", e);
      }
    };
    fetchOrcamentoPieChartData();

    // Nova lógica para buscar dados para o gráfico de pizza de 1st Visit
    const fetchFirstVisitPieData = async () => {
      try {
        const firstVisitCollectionRef = collection(db, 'firstVisit');
        const firstVisitSnapshot = await getDocs(firstVisitCollectionRef);
        let totalCount = 0;
        let totalGarantia = 0;

        firstVisitSnapshot.forEach(doc => {
          const data = doc.data();
          totalCount += data.count || 0;
          totalGarantia += data.totalGarantia || 0;
        });

        if (totalGarantia > 0) {
          const notFirstVisit = totalGarantia - totalCount;
          setFirstVisitPieData([
            { name: '1ST VISIT', value: totalCount },
            { name: '🚫 1ST VISIT', value: notFirstVisit }
          ]);
        } else {
          setFirstVisitPieData([]);
        }
      } catch (e) {
        console.error("Erro ao buscar dados para o gráfico de pizza de 1st Visit:", e);
      }
    };

    fetchFirstVisitPieData();

    setLoading(false);

    return () => {
      console.log("Limpando listeners do Firebase...");
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  const pieChartData = [
    { name: 'Valor Pago', value: totalOrcamentoPago },
    { name: 'Faltando para a Meta', value: Math.max(0, metaOrcamento - totalOrcamentoPago) }
  ];
  
  if (loading) {
    return <div className="no-data-message">Carregando dados do Firebase...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="output">
        <div className="kpi-chart-container" style={{ textAlign: 'center' }}>
          <h3 style={{ textAlign: 'center' }}>Progresso da Meta de Orçamento </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend wrapperStyle={{ color: '#e0e0e0' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="no-data-message" style={{ color: '#e0e0e0' }}>Meta: R$ {metaOrcamento.toFixed(2)}</p>
        </div>
      <div className="kpi-grid" style={{ marginBottom: '1px', marginTop: '1px' }}>
        <div className="kpi-chart-container" style={{ marginBottom: '0' }}>
          <p className="no-data-message" style={{ marginTop: '1px', color: '#e0e0e0' }}>Total pago hoje: R$ {carryInToday.toFixed(2)}  / / Total pago no mês: R$ {carryInMonth.toFixed(2)}</p>
        </div>
      </div>

      <div className="kpi-chart-container" style={{ textAlign: 'center' }}>
        <h3 style={{ textAlign: 'center' }}>Percentual de 1ST VISIT </h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={firstVisitPieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {firstVisitPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={FIRST_VISIT_PIE_COLORS[index % FIRST_VISIT_PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<Custom1stVisitPieTooltip />} />
              <Legend wrapperStyle={{ color: '#e0e0e0' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <p className="no-data-message" style={{ color: '#e0e0e0' }}>
          Total de Ordens Garantia: {firstVisitPieData.reduce((acc, curr) => acc + curr.value, 0)}
        </p>
      </div>

      <h3 style={{ textAlign: 'center' }}>KPIs de Desempenho </h3>
      <div className="kpi-grid">
        <KPIChart
          data={kpiData.map(d => ({ name: d.name, 'LTP VD %': parseFloat(d['LTP VD %']), 'LTP VD QTD': parseFloat(d['LTP VD QTD']) }))}
          title="LTP VD %"
          dataKeys={[{ dataKey: 'LTP VD %', stroke: '#8884d8', name: 'LTP VD %' }]}
          meta={[
            { value: 12.8, stroke: '#ffc658', label: 'Meta: 12.8%' },
            { value: 5, stroke: '#FF0000', label: 'P4P: 5%' }
          ]}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 40]}
        />
        <KPIChart
          data={kpiData.map(d => ({ name: d.name, 'EX LTP VD %': parseFloat(d['EX LTP VD %']), 'EX LTP VD QTD': parseFloat(d['EX LTP VD QTD']) }))}
          title="EX LTP VD %"
          dataKeys={[{ dataKey: 'EX LTP VD %', stroke: '#3366FF', name: 'EX LTP VD %' }]}
          meta={{ value: 1.44, stroke: '#FFCC00', label: 'Meta: 1.44%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 10]}
        />
        <KPIChart
          data={kpiData.map(d => ({ name: d.name, 'RRR VD %': parseFloat(d['RRR VD %']), 'RRR VD QTD': parseFloat(d['RRR VD QTD']) }))}
          title="RRR VD %"
          dataKeys={[{ dataKey: 'RRR VD %', stroke: '#8A2BE2', name: 'RRR VD %' }]}
          meta={[
            { value: 2.8, stroke: '#FFCC00', label: 'Meta: 2.8%' },
            { value: 1.5, stroke: '#008080', label: 'P4P: 1.5%' }
          ]}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 15]}
        />
        <KPIChart
          data={kpiData.map(d => ({ name: d.name, 'SSR VD': parseFloat(d['SSR VD']) }))}
          title="SSR VD %"
          dataKeys={[{ dataKey: 'SSR VD', stroke: '#BA55D3', name: 'SSR VD' }]}
          meta={{ value: 0.4, stroke: '#FFD700', label: 'Meta: 0.4%' }}
          tooltipContent={<CustomTooltip />}
        />
        <KPIChart
          data={kpiData.map(d => ({ name: d.name, 'FTC HAPPY CALL': parseFloat(d['FTC HAPPY CALL']) }))}
          title="FTC HAPPY CALL %"
          dataKeys={[{ dataKey: 'FTC HAPPY CALL', stroke: '#9C27B0', name: 'FTC HAPPY CALL' }]}
          meta={{ value: 88, stroke: '#FFEB3B', label: 'Meta: 88%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 100]}
        />
        <KPIChart
          data={kpiData.map(d => ({ name: d.name, 'ECO REPAIR VD': parseFloat(d['ECO REPAIR VD']) }))}
          title="ECO REPAIR VD %"
          dataKeys={[{ dataKey: 'ECO REPAIR VD', stroke: '#4CAF50', name: 'ECO REPAIR VD' }]}
          meta={{ value: 60, stroke: '#FF5722', label: 'Meta: 60%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 100]}
        />
          <KPIChart
          data={firstVisitChartData}
          title="1ST VISIT VD %"
          dataKeys={[{ dataKey: 'Proporção (%)', stroke: '#8884d8', name: 'Proporção (%)' }]}
          meta={{ value: 100, stroke: '#FF0000', label: 'Meta: 100%' }}
          tooltipContent={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const dataPoint = payload[0].payload;
              return (
                <div className="custom-tooltip">
                  <p className="label">Semana: {label}</p>
                  <p>1st Visit: {dataPoint['1st Visit']}</p>
                  <p>Total Garantia: {dataPoint['Total Garantia']}</p>
                  <p>Proporção: {dataPoint['Proporção (%)']}%</p>
                </div>
              );
            }
            return null;
          }}
          yAxisDomain={[0, 120]}
        />
        <KPIChart
          data={kpiData.map(d => ({ name: d.name, 'R-NPS VD': parseFloat(d['R-NPS VD']) }))}
          title="R-NPS VD %"
          dataKeys={[{ dataKey: 'R-NPS VD', stroke: '#525f69ff', name: 'R-NPS VD' }]}
          meta={{ value: 80, stroke: '#9ACD32', label: 'Meta: 80%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 100]}
        />
      </div>
    </div>
  );
}

export default Dashboard;