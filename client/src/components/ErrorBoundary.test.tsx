import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';
import { setClientObservabilitySinkForTests, type ClientErrorReport } from '../services/observability';

it('reports a sanitized render category, shows a reference and recovers',()=>{
  const consoleError=vi.spyOn(console,'error').mockImplementation(()=>{}),reports:ClientErrorReport[]=[];setClientObservabilitySinkForTests(report=>reports.push(report));let fail=true;
  function Child(){if(fail)throw new Error('private form value');return <p>Recovered safely</p>;}
  render(<ErrorBoundary><Child/></ErrorBoundary>);
  expect(screen.getByRole('heading',{name:'AniVerse couldn’t load this page'})).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(/^Reference: [A-Za-z0-9]{8}$/);
  expect(document.body).not.toHaveTextContent('private form value');
  fail=false;fireEvent.click(screen.getByRole('button',{name:'Try again'}));expect(screen.getByText('Recovered safely')).toBeInTheDocument();
  const report=JSON.stringify(reports);expect(report).toContain('RENDER_FAILED');expect(report).not.toContain('private form value');setClientObservabilitySinkForTests(null);consoleError.mockRestore();
});
