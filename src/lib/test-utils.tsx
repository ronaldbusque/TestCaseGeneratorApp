import { render as rtlRender } from '@testing-library/react';
import { ReactElement } from 'react';

function render(ui: ReactElement, options = {}) {
  return rtlRender(ui, {
    wrapper: ({ children }) => children,
    ...options,
  });
}

export * from '@testing-library/react';
export { render }; 