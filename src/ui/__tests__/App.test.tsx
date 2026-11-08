// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

afterEach(cleanup);
import App from '../../App';
import { exportHtml } from '../../domain/__tests__/fixtures';

const fileOf = (name: string, usernames: string[]) =>
  new File([exportHtml(usernames)], name, { type: 'text/html' });

async function loadFiles() {
  const user = userEvent.setup();
  render(<App />);
  const inputs = screen.getAllByLabelText(/\.html/, { selector: 'input' });
  await user.upload(inputs[0], fileOf('following.html', ['natgeo', 'instagram', 'oneway']));
  await user.upload(inputs[1], fileOf('followers.html', ['natgeo']));
  await user.click(screen.getByRole('button', { name: 'נתח' }));
  await waitFor(() => expect(screen.getByRole('tablist')).toBeTruthy());
}

describe('App', () => {
  it('shows accounts that do not follow back by default', async () => {
    await loadFiles();
    await waitFor(() => expect(screen.getByText('@instagram')).toBeTruthy());
    expect(screen.getByText('@oneway')).toBeTruthy();
    expect(screen.queryByText('@natgeo')).toBeNull();
  });

  it('shows followers not followed back on the fans tab', async () => {
    const user = userEvent.setup();
    render(<App />);
    const inputs = screen.getAllByLabelText(/\.html/, { selector: 'input' });
    await user.upload(inputs[0], fileOf('following.html', ['natgeo']));
    await user.upload(inputs[1], fileOf('followers.html', ['natgeo', 'fan2']));
    await user.click(screen.getByRole('button', { name: 'נתח' }));
    await user.click(await screen.findByRole('tab', { name: 'העוקבים שלך' }));
    await waitFor(() => expect(screen.getByText('@fan2')).toBeTruthy());
    expect(screen.queryByText('@natgeo')).toBeNull();
  });

  it('shows analytics on the analytics tab', async () => {
    const user = userEvent.setup();
    await loadFiles();
    await user.click(screen.getByRole('tab', { name: 'אנליטיקות' }));
    await waitFor(() => expect(screen.getByText('אחוז עוקבים חוזרים')).toBeTruthy());
  });

  it('reports a wrong file instead of crashing', async () => {
    const user = userEvent.setup();
    render(<App />);
    const inputs = screen.getAllByLabelText(/\.html/, { selector: 'input' });
    await user.upload(inputs[0], new File(['<html></html>'], 'following.html', { type: 'text/html' }));
    await user.upload(inputs[1], fileOf('followers.html', ['natgeo']));
    await user.click(screen.getByRole('button', { name: 'נתח' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('following.html'));
  });
});
