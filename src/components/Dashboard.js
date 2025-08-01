// src/components/Dashboard.js
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine, Label } from 'recharts';

const KPIChart = ({ data, title, dataKeys, meta, tooltipContent, yAxisDomain = [0, 'auto'] }) => {
  if (!data || data.length === 0) {
    return <p className="no-data-message">Nenhum dado de "{title}" encontrado para as últimas 8 semanas.</p>;
  }

  return (
    <div className="kpi-chart-container">
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
            {meta && Array.isArray(meta) ? (
              meta.map((m, idx) => (
                <ReferenceLine key={idx} y={m.value} stroke={m.stroke} strokeDasharray="3 3">
                  <Label
                    value={m.label}
                    position="right"
                    fill={m.stroke}
                    style={{ fontSize: '0.8em', textAnchor: 'start' }}
                  />
                </ReferenceLine>
              ))
            ) : (
              meta && (
                <ReferenceLine y={meta.value} stroke={meta.stroke} strokeDasharray="3 3">
                  <Label
                    value={meta.label}
                    position="right"
                    fill={meta.stroke}
                    style={{ fontSize: '0.8em', textAnchor: 'start' }}
                  />
                </ReferenceLine>
              )
            )}
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

const META_ORC_IH = 75000;

function Dashboard() {
  const [kpiData, setKpiData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [carryInToday, setCarryInToday] = useState(0);
  const [carryInMonth, setCarryInMonth] = useState(0);
  const [firstVisitData, setFirstVisitData] = useState({ count: 0, totalGarantia: 0 });
  const [firstVisitChartData, setFirstVisitChartData] = useState([]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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
    
    const fetchFirstVisitStats = async () => {
        const today = new Date();
        const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
        const weekString = `${startOfWeek.getFullYear()}-${startOfWeek.getMonth() + 1}-${startOfWeek.getDate()}`;

        const firstVisitDoc = await getDoc(doc(db, 'firstVisit', weekString));
        if (firstVisitDoc.exists()) {
          setFirstVisitData(firstVisitDoc.data());
        }
    };
    fetchFirstVisitStats();

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

    setLoading(false);

    return () => {
      console.log("Limpando listeners do Firebase...");
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  const calculateFirstVisitPercentage = () => {
    const { count, totalGarantia } = firstVisitData;
    if (totalGarantia === 0) return { percentage: 0, count, totalGarantia };
    return {
      percentage: ((count / totalGarantia) * 100).toFixed(2),
      count,
      totalGarantia
    };
  };

  const { percentage: firstVisitPercentage, count: firstVisitCount, totalGarantia } = calculateFirstVisitPercentage();
  const firstVisitDisplay = `1st Visit: ${firstVisitCount} de ${totalGarantia} (${firstVisitPercentage}%)`;

  const calculateWeeklyMetrics = (dataPoint) => {
    let score = 0;
    let accelerators = 0;
    let detractors = 0;

    const ltpVd = parseFloat(dataPoint['LTP VD %']);
    const rrrVd = parseFloat(dataPoint['RRR VD %']);
    const rnpsVd = parseFloat(dataPoint['R-NPS VD']);
    const ssrVd = parseFloat(dataPoint['SSR VD']);
    const ecoRepairVd = parseFloat(dataPoint['ECO REPAIR VD']);
    const ftcHappyCall = parseFloat(dataPoint['FTC HAPPY CALL']);

    if (ltpVd <= 5) score += 2;
    if (rrrVd <= 1.5) score += 1;
    if (rnpsVd >= 80) score += 0.5;
    if (ssrVd <= 0.4) score += 1;
    if (ecoRepairVd >= 60) score += 1;
    if (ftcHappyCall >= 88) score += 1;

    const vendasStorePlus = parseFloat(dataPoint['VENDAS STORE+']);
    const firstVisitVd = parseFloat(dataPoint['1ST VISIT VD']);
    const poInHomeD1 = parseFloat(dataPoint['PO IN HOME D+1']);

    if (vendasStorePlus >= 3) accelerators += 1;
    if (firstVisitVd >= 20) accelerators += 1;
    if (poInHomeD1 >= 70) accelerators += 1;

    const treinamentos = parseFloat(dataPoint['Treinamentos']);
    const inHomeD1 = parseFloat(dataPoint['IN HOME D+1']);
    const orcamento = parseFloat(dataPoint['Orçamento']);

    if (treinamentos < 100) detractors += 1;
    if (inHomeD1 < 20) detractors += 1;
    if (orcamento < META_ORC_IH) detractors += 1;

    const finalScore = score + accelerators - detractors;

    return { score, accelerators, detractors, finalScore };
  };

  const weeklyScores = useMemo(() => {
    return kpiData.map(dataPoint => ({
      name: dataPoint.name,
      week: dataPoint.week,
      ...calculateWeeklyMetrics(dataPoint),
    }));
  }, [kpiData]);

  const calculateCommission = (finalScore) => {
    if (finalScore < 5) {
      return 0;
    } else if (finalScore >= 5 && finalScore < 7) {
      return 200;
    } else if (finalScore >= 7 && finalScore < 9) {
      return 300;
    } else if (finalScore >= 9) {
      return 400;
    }
    return 0;
  };

  const lastWeekScore = weeklyScores.length > 0 ? weeklyScores[weeklyScores.length - 1].finalScore : 0;
  const lastWeekCommission = calculateCommission(lastWeekScore);

  if (loading) {
    return <div className="no-data-message">Carregando dados do Firebase...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="output">
      <h3>Métricas de Orçamentos</h3>
      <div className="kpi-grid">
        <div className="kpi-chart-container">
          <h3>Total Pago Hoje</h3>
          <p className="no-data-message">R$ {carryInToday.toFixed(2)}</p>
        </div>
        <div className="kpi-chart-container">
          <h3>Total Pago no Mês</h3>
          <p className="no-data-message">R$ {carryInMonth.toFixed(2)}</p>
        </div>
      </div>

      <h3>KPIs de Desempenho </h3>
      <div className="kpi-grid">
        {/* Gráfico de Proporção de Reparos 1st Visit */}
        <KPIChart
          data={firstVisitChartData}
          title="Proporção de 1st Visit (Semanal)"
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
          data={kpiData.map(d => ({ name: d.name, 'LTP VD %': parseFloat(d['LTP VD %']), 'LTP VD QTD': parseFloat(d['LTP VD QTD']) }))}
          title=" LTP VD % "
          dataKeys={[{ dataKey: 'LTP VD %', stroke: '#8884d8', name: 'LTP VD %' }]}
          meta={[
            { value: 12.8, stroke: '#ffc658', label: 'Meta: 12.8%' },
            { value: 5, stroke: '#FF0000', label: 'P4P: 5%' }
          ]}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 40]}
        />
        <KPIChart
          data={kpiData.map(d => ({ name: d.name, 'LTP DA %': parseFloat(d['LTP DA %']), 'LTP DA QTD': parseFloat(d['LTP DA QTD']) }))}
          title=" LTP DA % "
          dataKeys={[{ dataKey: 'LTP DA %', stroke: '#ff7300', name: 'LTP DA %' }]}
          meta={[
            { value: 17.4, stroke: '#00C49F', label: 'Meta: 17.4%' },
            { value: 7, stroke: '#FFD700', label: 'P4P: 7%' }
          ]}
          tooltipContent={<CustomTooltip />}
        />

        <KPIChart
          data={kpiData.map(d => ({ name: d.name, 'EX LTP VD %': parseFloat(d['EX LTP VD %']), 'EX LTP VD QTD': parseFloat(d['EX LTP VD QTD']) }))}
          title=" EX LTP VD % "
          dataKeys={[{ dataKey: 'EX LTP VD %', stroke: '#3366FF', name: 'EX LTP VD %' }]}
          meta={{ value: 1.44, stroke: '#FFCC00', label: 'Meta: 1.44%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 10]}
        />

        <KPIChart
          data={kpiData.map(d => ({ name: d.name, 'EX LPT DA %': parseFloat(d['EX LRP DA QTD']), 'EX LRP DA QTD': parseFloat(d['EX LRP DA QTD']) }))}
          title=" EX LTP DA % "
          dataKeys={[{ dataKey: 'EX LPT DA %', stroke: '#CC0066', name: 'EX LTP DA %' }]}
          meta={{ value: 1.50, stroke: '#99FF00', label: 'Meta: 1.50%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 10]}
        />

        <KPIChart
          data={kpiData.map(d => ({ name: d.name, 'RRR VD %': parseFloat(d['RRR VD %']), 'RRR VD QTD': parseFloat(d['RRR VD QTD']) }))}
          title=" RRR VD % "
          dataKeys={[{ dataKey: 'RRR VD %', stroke: '#8A2BE2', name: 'RRR VD %' }]}
          meta={[
            { value: 2.8, stroke: '#FFCC00', label: 'Meta: 2.8%' },
            { value: 1.5, stroke: '#008080', label: 'P4P: 1.5%' }
          ]}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 15]}
        />

        <KPIChart
          data={kpiData.map(d => ({ name: d.name, 'RRR DA %': parseFloat(d['RRR DA %']), 'RRR DA QTD': parseFloat(d['RRR DA QTD']) }))}
          title=" RRR DA % "
          dataKeys={[{ dataKey: 'RRR DA %', stroke: '#A52A2A', name: 'RRR DA %' }]}
          meta={[
            { value: 5, stroke: '#FF4500', label: 'Meta: 5%' },
            { value: 3, stroke: '#FFD700', label: 'P4P: 3%' }
          ]}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 15]}
        />

        <KPIChart
          data={kpiData.map(d => ({ name: d.name, 'SSR VD': parseFloat(d['SSR VD']) }))}
          title=" SSR VD % "
          dataKeys={[{ dataKey: 'SSR VD', stroke: '#BA55D3', name: 'SSR VD' }]}
          meta={{ value: 0.4, stroke: '#FFD700', label: 'Meta: 0.4%' }}
          tooltipContent={<CustomTooltip />}
        />

        <KPIChart
          data={kpiData.map(d => ({ name: d.name, 'SSR DA': parseFloat(d['SSR DA']) }))}
          title=" SSR DA % "
          dataKeys={[{ dataKey: 'SSR DA', stroke: '#FF00FF', name: 'SSR DA' }]}
          meta={{ value: 1.1, stroke: '#FFA07A', label: 'Meta: 1.1%' }}
          tooltipContent={<CustomTooltip />}
        />

        <KPIChart
          data={kpiData.map(d => ({ name: d.name, 'ECO REPAIR VD': parseFloat(d['ECO REPAIR VD']) }))}
          title=" ECO REPAIR VD % "
          dataKeys={[{ dataKey: 'ECO REPAIR VD', stroke: '#4CAF50', name: 'ECO REPAIR VD' }]}
          meta={{ value: 60, stroke: '#FF5722', label: 'Meta: 60%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 100]}
        />

        <KPIChart
          data={kpiData.map(d => ({ name: d.name, 'FTC HAPPY CALL': parseFloat(d['FTC HAPPY CALL']) }))}
          title=" FTC HAPPY CALL % "
          dataKeys={[{ dataKey: 'FTC HAPPY CALL', stroke: '#9C27B0', name: 'FTC HAPPY CALL' }]}
          meta={{ value: 88, stroke: '#FFEB3B', label: 'Meta: 88%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 100]}
        />

        <KPIChart
          data={kpiData.map(d => ({ name: d.name, 'PO IN HOME D+1': parseFloat(d['PO IN HOME D+1']) }))}
          title=" PO IN HOME D+1 % "
          dataKeys={[{ dataKey: 'PO IN HOME D+1', stroke: '#3F51B5', name: 'PO IN HOME D+1' }]}
          meta={{ value: 70, stroke: '#FFC107', label: 'Meta: 70%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 100]}
        />

        <KPIChart
          data={kpiData.map(d => ({ name: d.name, '1ST VISIT VD': parseFloat(d['1ST VISIT VD']) }))}
          title=" 1ST VISIT VD % "
          dataKeys={[{ dataKey: '1ST VISIT VD', stroke: '#FFBB28', name: '1ST VISIT VD' }]}
          meta={{ value: 20, stroke: '#FF0000', label: 'Meta: 20%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 100]}
        />

        <KPIChart
          data={kpiData.map(d => ({ name: d.name, 'IN HOME D+1': parseFloat(d['IN HOME D+1']) }))}
          title=" IN HOME D+1 % "
          dataKeys={[{ dataKey: 'IN HOME D+1', stroke: '#00C49F', name: 'IN HOME D+1' }]}
          meta={{ value: 20, stroke: '#FF4081', label: 'Meta: 20%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 50]}
        />

        <KPIChart
          data={kpiData.map(d => ({ name: d.name, 'R-NPS VD': parseFloat(d['R-NPS VD']) }))}
          title=" R-NPS VD % "
          dataKeys={[{ dataKey: 'R-NPS VD', stroke: '#4682B4', name: 'R-NPS VD' }]}
          meta={{ value: 80, stroke: '#9ACD32', label: 'Meta: 80%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 100]}
        />

        <KPIChart
          data={kpiData.map(d => ({ name: d.name, 'R-NPS DA': parseFloat(d['R-NPS DA']) }))}
          title=" R-NPS DA % "
          dataKeys={[{ dataKey: 'R-NPS DA', stroke: '#FF4500', name: 'R-NPS DA' }]}
          meta={{ value: 78, stroke: '#ADFF2F', label: 'Meta: 78%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 100]}
        />
      </div>

      ---

      {isMobile ? (
        <>
          <h2>Outras Métricas por Semana</h2>
          {kpiData.length === 0 ? (
            <p className="no-data-message">Nenhum dado de Orçamento, Treinamentos ou Vendas Store+ encontrado para as últimas 8 semanas.</p>
          ) : (
            kpiData.map((dataPoint, index) => (
              <div key={dataPoint.name} style={{ marginBottom: '15px', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
                <h1 style={{ fontSize: '1.2em', margin: '5px 0', textAlign: 'center' }}>{dataPoint.name}</h1>
                <p style={{ textAlign: 'center' }}>Orçamento: {dataPoint['Orçamento'] || 'N/A'}</p>
                <p style={{ textAlign: 'center' }}>Treinamentos %: {dataPoint['Treinamentos'] || 'N/A'}</p>
                <p style={{ textAlign: 'center' }}>Vendas Store+: {dataPoint['VENDAS STORE+'] || 'N/A'}</p>
              </div>
            ))
          )}
        </>
      ) : (
        <>
          <h3>Outras Métricas por Semana </h3>
          {kpiData.length === 0 ? (
            <p className="no-data-message">Nenhum dado de Orçamento, Treinamentos ou Vendas Store+ encontrado para as últimas 8 semanas.</p>
          ) : (
            <table style={{
              width: '80%',
              borderCollapse: 'collapse',
              marginTop: '20px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              <thead>
                <tr style={{ background: '#333' }}>
                  <th style={{ padding: '10px', border: '1px solid #555', textAlign: 'left' }}>Semana</th>
                  <th style={{ padding: '10px', border: '1px solid #555', textAlign: 'left' }}>Orçamento </th>
                  <th style={{ padding: '10px', border: '1px solid #555', textAlign: 'left' }}>Treinamentos % </th>
                  <th style={{ padding: '10px', border: '1px solid #555', textAlign: 'left' }}>Vendas Store+ </th>
                </tr>
              </thead>
              <tbody>
                {kpiData.map((dataPoint, index) => (
                  <tr key={dataPoint.name} style={{ background: index % 2 === 0 ? '#2a2a2a' : '#3a3a3a' }}>
                    <td style={{ padding: '10px', border: '1px solid #555' }}>{dataPoint.name}</td>
                    <td style={{ padding: '10px', border: '1px solid #555' }}>
                      {dataPoint['Orçamento'] || 'N/A'}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #555' }}>
                      {dataPoint['Treinamentos'] || 'N/A'}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #555' }}>
                      {dataPoint['VENDAS STORE+'] || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      ---

      {weeklyScores.length > 0 && (
        <h1 style={{ color: '#9e9e9e', marginTop: '30px', marginBottom: '20px', textAlign: 'center' }}>
          Comissionamento baseado na última semana:
          R$ {lastWeekCommission.toFixed(2)}
        </h1>
      )}
    </div>
  );
}

export default Dashboard;