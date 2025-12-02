import React from 'react';
import '../styles/components/StatusBadge.css';

const StatusBadge = ({ status }) => {
  const statusClass = status ? status.toLowerCase().replace(/\s+/g, '-') : '';
  return <span className={`status-badge ${statusClass}`}>{status}</span>;
};

export default StatusBadge;
