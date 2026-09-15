import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppLayout, routeName } from '../layouts/AppLayout';
import { ConfirmDialog } from './ConfirmDialog';
import { AnimeImage } from './AnimeImage';
import { ProgressBar } from './ProgressBar';
vi.mock('../context/LibraryContext', () => ({useOptionalLibrary:()=>null}));
vi.mock('./Navbar', () => ({Navbar:()=> <nav><Link to="/profile">Profile</Link><Link to="/profile?page=2">Page 2</Link></nav>}));
vi.mock('./MobileNav', () => ({MobileNav:()=>null}));
vi.mock('./Footer', () => ({Footer:()=>null}));
vi.mock('./ScrollToTop', () => ({ScrollToTop:()=>null}));

describe('accessibility shell and modal semantics',()=>{
  it('keeps initial Tab on skip link and focuses only pathname navigation',async()=>{
    const user=userEvent.setup();
    render(<MemoryRouter><Routes><Route element={<AppLayout/>}><Route index element={<h1>Home</h1>}/><Route path="profile" element={<h1>Profile</h1>}/></Route></Routes></MemoryRouter>);
    await user.tab();expect(screen.getByRole('link',{name:'Skip to main content'})).toHaveFocus();
    await user.click(screen.getByRole('link',{name:'Profile'}));
    await waitFor(()=>expect(screen.getByRole('main')).toHaveFocus());
    expect(screen.getByRole('status')).toHaveTextContent('Profile page loaded');
    await user.click(screen.getByRole('link',{name:'Page 2'}));
    expect(screen.getByRole('link',{name:'Page 2'})).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('Profile page loaded');
  });
  it('uses safe route names for details and watch without IDs',()=>{
    expect(routeName('/anime/12345')).toBe('Anime details');expect(routeName('/watch/123/4')).toBe('Watch');
  });
  it('isolates background, traps focus and restores it even across dialog rerenders',async()=>{
    const user=userEvent.setup();
    function Example(){const[open,setOpen]=useState(false);return <><button onClick={()=>setOpen(true)}>Open</button>{open&&<ConfirmDialog title="Confirm action" description="Check before deleting." requireText="RESET" onConfirm={()=>{}} onCancel={()=>setOpen(false)}/>}</>;}
    const {container}=render(<Example/>);
    const trigger=screen.getByRole('button',{name:'Open'});await user.click(trigger);
    expect(container.inert).toBe(true);
    const input=screen.getByRole('textbox');await user.type(input,'RE');expect(input).toHaveFocus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');expect(screen.getByRole('button',{name:'Cancel'})).toHaveFocus();
    await user.keyboard('{Escape}');expect(trigger).toHaveFocus();expect(container.inert).toBeFalsy();
  });
  it('hides decorative fallback and names meaningful fallback and progress',()=>{
    render(<><AnimeImage src={null} alt=""/><AnimeImage src={null} alt="Naruto cover"/><ProgressBar value={42} label="Episode 5 watched"/></>);
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.getByRole('progressbar',{name:'Episode 5 watched'})).toHaveAttribute('aria-valuenow','42');
  });
});
