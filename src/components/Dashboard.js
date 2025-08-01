// src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, query, orderBy, getDoc, doc } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Label } from 'recharts';

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

function Dashboard() {
  const [kpiData, setKpiData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [carryInToday, setCarryInToday] = useState(0);
  const [carryInMonth, setCarryInMonth] = useState(0);
  const [firstVisitChartData, setFirstVisitChartData] = useState([]);

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

    setLoading(false);

    return () => {
      console.log("Limpando listeners do Firebase...");
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, []);

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
          <h3>Total pago no mês</h3>
          <p className="no-data-message">R$ {carryInMonth.toFixed(2)}</p>
        </div>
      </div>

      <h3>KPIs de Desempenho </h3>
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
          dataKeys={[{ dataKey: 'R-NPS VD', stroke: '#4682B4', name: 'R-NPS VD' }]}
          meta={{ value: 80, stroke: '#9ACD32', label: 'Meta: 80%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 100]}
        />
      </div>
    </div>
  );
}

export default Dashboard;