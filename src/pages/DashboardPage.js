// src/pages/DashboardPage.js
import React from 'react';
import Dashboard from '../components/Dashboard';

function DashboardPage() {
  return (
    <div className="dashboard-page">
      <h1 style={{ textAlign: 'center' }}>Métricas e Desempenho</h1>
      <Dashboard />
    </div>
  );
}

export default DashboardPage;