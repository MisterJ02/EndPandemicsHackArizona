function haversineMi(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
          + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 60)   return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

function riskMeta(score) {
  if (score < 25) return { label: 'Low Risk',      color: '#22c55e', zone: 'z-low'  };
  if (score < 50) return { label: 'Moderate Risk', color: '#eab308', zone: 'z-mod'  };
  if (score < 75) return { label: 'Elevated Risk', color: '#f97316', zone: 'z-elev' };
  return              { label: 'High Risk',       color: '#ef4444', zone: 'z-high' };
}
