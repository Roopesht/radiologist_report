/** @jest-environment jsdom */
import { act } from 'react-dom/test-utils';

describe('entry point contract', () => {
  it('mounts the app into #root when it is imported, and mount() can target another element', async () => {
    document.body.innerHTML = '<div id="root"></div><div id="other"></div>';
    await act(async () => { await import('../../../../src/main'); });
    expect(document.getElementById('root')!.textContent).toMatch(/Abbreviation rules/);      // the root redirects to the rules page
    const { mount } = await import('../../../../src/main');
    await act(async () => { mount(document.getElementById('other')); });
    expect(document.getElementById('other')!.textContent).toMatch(/Abbreviation rules/);
  });

  it('mount() does nothing without an element', async () => {
    const { mount } = await import('../../../../src/main');
    expect(mount(null)).toBeNull();
  });
});
