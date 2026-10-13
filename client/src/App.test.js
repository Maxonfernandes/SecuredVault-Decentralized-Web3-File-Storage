import { render, screen } from '@testing-library/react';
import App from './App';

test('renders SecuredVault title and connect button gracefully without ethereum provider', () => {
  render(<App />);
  const titleElements = screen.getAllByText(/SecuredVault/i);
  expect(titleElements.length).toBeGreaterThan(0);
  const connectButton = screen.getByText(/Connect MetaMask/i);
  expect(connectButton).toBeInTheDocument();
});
