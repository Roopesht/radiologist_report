import { pageHead, esc } from '../../shared/components.js?v=1';
import { input, radios, button } from '../../shared/form.js?v=1';

export const meta = { code: 'S01', name: 'Patient details', side: 'main', icon: 'home', nav: 'Patient', roles: ['radiologist'] };

export function render({ data }) {
  const p = data.patient;
  return `${pageHead('Patient details')}
  <div class="card">
    ${input('Name', p.name, { required: true, toast: 'Name would be saved in the report header.' })}
    ${input('Age (years)', p.age, { toast: 'Age would be saved in the report header.' })}
    ${radios('Sex', 'sex', ['Male', 'Female'], p.sex, { toast: 'Sex would set MR./MRS. and which sex-specific tags are accepted.' })}
    ${input('Referred by', p.referredBy, { toast: 'Referred by would be saved in the report header.' })}
    ${input('Date', p.date, { toast: 'Date defaults to today (d-MMM-yy).' })}
    ${input('UHID NO', p.uhid, { toast: 'UHID would be saved in the report header.' })}
    ${input('Sr. No', p.srNo, { notDefined: 'Whether Sr. No is generated or typed is not defined in REQ-267.' })}
    <p>${button('Save and enter tags', { primary: true, action: 'save-patient', goto: 'S02' })}</p>
  </div>`;
}
