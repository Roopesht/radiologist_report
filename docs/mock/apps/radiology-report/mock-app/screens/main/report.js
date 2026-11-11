import { esc } from '../../shared/components.js?v=1';

export const meta = { code: 'S03', name: 'Report', side: 'main', icon: 'home', nav: 'Report', roles: ['radiologist'] };

export function render({ data }) {
  const p = data.patient;
  const title = p.sex === 'Female' ? 'MRS.' : 'MR.';
  return `<div class="card report">
    <h2 style="text-align:center">DEPARTMENT OF RADIODIAGNOSIS</h2>
    <p>Name: ${title} ${esc(p.name)}<br>Age/Sex: ${esc(p.age)} Y / ${esc(p.sex === 'Female' ? 'F' : 'M')}<br>Referred by: ${esc(p.referredBy)}<br>Date: ${esc(p.date)}<br>UHID NO: ${esc(p.uhid)}<br>Sr. No: ${esc(p.srNo)}</p>
    <h3 style="text-align:center">ULTRASOUND WHOLE ABDOMEN</h3>
    <p>${esc(data.report.liver)}</p>
    <p>${esc(data.report.pancreas)}</p>
    <p><strong>IMPRESSION:</strong> ${esc(data.report.impression)}</p>
    <p><strong>Dr. Pankaj Singhal</strong><br>MD Radio Diagnosis<br>SENIOR CONSULTANT<br>HMC – HN004918</p>
    <p><em>Note: Not valid for medico legal purposes.</em></p>
  </div>`;
}
