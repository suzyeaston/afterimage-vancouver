(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AfterimageCore = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const BOUNDS = Object.freeze({ west: -123.36, east: -122.76, south: 49.05, north: 49.39 });
  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  }
  function safeUrl(value) {
    try {
      const url = new URL(String(value));
      return url.protocol === 'https:' ? url.href : '#';
    } catch { return '#'; }
  }
  function project(lat, lng) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      x: 55 + (lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west) * 1090,
      y: 55 + (BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south) * 580
    };
  }
  function coordinateGroups(records) {
    const groups = new Map();
    for (const record of records) {
      if (!Number.isFinite(record.lat) || !Number.isFinite(record.lng)) continue;
      const key = Number(record.lat).toFixed(6) + ',' + Number(record.lng).toFixed(6);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record);
    }
    return [...groups.entries()].map(([key, items]) => ({
      id: key.replace(/[^0-9]/g, '-'),
      lat: items[0].lat,
      lng: items[0].lng,
      records: items
    }));
  }
  function jobStatus(job) {
    return job.status === 'recently-listed' ? 'Listed when checked' :
      job.status === 'interest-only' ? 'Interest form, not an opening' : 'Needs recheck';
  }
  function dateLabel(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return 'Date unknown';
    const date = new Date(value + 'T12:00:00Z');
    return Number.isNaN(date.getTime()) ? 'Date unknown' :
      date.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  }
  return { BOUNDS, escapeHTML, safeUrl, project, coordinateGroups, jobStatus, dateLabel };
});