// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JSZip from 'jszip';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../../App';
import { exportHtml } from '../../domain/__tests__/fixtures';

afterEach(cleanup);

async function zipOf(following: string[], followers: string[]): Promise<File> {
  const zip = new JSZip();
  zip.file('connections/followers_and_following/following.html', exportHtml(following));
  zip.file('connections/followers_and_following/followers.html', exportHtml(followers));
  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], 'export.zip', { type: 'application/zip' });
}

async function uploadZip(user: ReturnType<typeof userEvent.setup>, file: File) {
  const inputs = screen.getAllByLabelText('קובץ ZIP של הייצוא');
  await user.upload(inputs[inputs.length - 1], file);
  const buttons = screen.getAllByRole('button', { name: 'נתח' });
  await user.click(buttons[buttons.length - 1]);
  await waitFor(() => expect(screen.getByRole('tablist')).toBeTruthy());
}

describe('ZIP loading and snapshot comparison', () => {
  it('loads a snapshot from the export ZIP', async () => {
    const user = userEvent.setup();
    render(<App />);
    await uploadZip(user, await zipOf(['natgeo', 'oneway'], ['natgeo']));
    await waitFor(() => expect(screen.getByText('@oneway')).toBeTruthy());
    expect(screen.queryByText('@natgeo')).toBeNull();
  });

  it('shows accounts no longer present after loading a previous export', async () => {
    const user = userEvent.setup();
    render(<App />);
    await uploadZip(user, await zipOf(['natgeo'], ['natgeo']));
    await user.click(screen.getByRole('button', { name: /יש לך ייצוא קודם/ }));
    await uploadZip(user, await zipOf(['natgeo'], ['natgeo', 'oldfan']));
    await waitFor(() => expect(screen.getByText('@oldfan')).toBeTruthy());
    expect(screen.getByText(/לא נמצאו יותר ברשימת העוקבים/)).toBeTruthy();
  });

  it('reports a ZIP without the export files', async () => {
    const user = userEvent.setup();
    render(<App />);
    const zip = new JSZip();
    zip.file('readme.txt', 'hello');
    const blob = await zip.generateAsync({ type: 'blob' });
    await user.upload(
      screen.getByLabelText('קובץ ZIP של הייצוא'),
      new File([blob], 'other.zip', { type: 'application/zip' }),
    );
    await user.click(screen.getByRole('button', { name: 'נתח' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('following.html'));
  });
});
