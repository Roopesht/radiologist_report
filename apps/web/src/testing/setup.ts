// Runs before every test file: Testing Library's DOM matchers and the browser APIs jsdom does not provide.
import '@testing-library/jest-dom';

// Tests that opt into the node environment (@jest-environment node) have no window.
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    (window as any).matchMedia = (query: string) => ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false });
  }
  if (!(window as any).ResizeObserver) {
    (window as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  }
  if (!window.scrollTo || String(window.scrollTo).includes('not implemented')) window.scrollTo = (() => undefined) as typeof window.scrollTo;
}

// Forget this file once it has run, so a test that imports it again (the setup contract test) runs it again.
// Nothing else is loaded yet, so no module ends up twice.
if (typeof jest !== 'undefined') jest.resetModules();
