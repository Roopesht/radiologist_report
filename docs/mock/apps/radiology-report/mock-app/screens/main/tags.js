import { pageHead, esc } from '../../shared/components.js?v=1';
import { button } from '../../shared/form.js?v=1';

export const meta = { code: 'S02', name: 'Enter tags', side: 'main', icon: 'home', nav: 'Tags', roles: ['radiologist'] };

export function render({ data }) {
  const t = data.tags;
  const chips = [t.first, t.second].filter(Boolean).map((x) => `<span class="badge badge-neutral">${esc(x)}</span>`).join(' ');
  const typing = t.first ? 'P' : 'Li15.30';
  const addAction = t.first ? 'add-second' : 'add-first';
  return `${pageHead('Enter tags')}
  <div class="card">
    <label class="field"><span>Tag</span><input value="${esc(typing)}" ${''} data-toast="Typing a tag would expand it using the abbreviation rules."></label>
    <p>${button('Add tag', { action: addAction })}</p>
    <p><strong>Tags typed:</strong> ${chips || '<em>none yet</em>'}</p>
    <p>${button('Create report', { primary: true, action: 'create-report', goto: 'S03' })}</p>
  </div>`;
}
