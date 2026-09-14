import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {ProfilePage} from './ProfilePage';
import {profileApi,type Profile} from '../services/profileApi';
const auth=vi.hoisted(()=>({mode:'supabase',user:{id:'fixture-user'},loading:false,error:null as string|null,signOut:vi.fn()}));
vi.mock('../auth/AuthContext',()=>({useAuth:()=>auth}));
vi.mock('../services/profileApi',async importOriginal=>({...await importOriginal<typeof import('../services/profileApi')>(),profileApi:{get:vi.fn(),update:vi.fn()}}));
const profile:Profile={displayName:'Anime Explorer',avatarId:'avatar-01',createdAt:null,updatedAt:null,email:'a@example.invalid',joinedAt:'2025-01-02T00:00:00Z',mode:'cloud'};
function mount(){return render(<MemoryRouter><ProfilePage/></MemoryRouter>);}
async function loaded(){await screen.findByLabelText('Display name');}
beforeEach(()=>{vi.clearAllMocks();auth.mode='supabase';auth.user={id:'fixture-user'};auth.loading=false;auth.error=null;vi.mocked(profileApi.get).mockResolvedValue({...profile});vi.mocked(profileApi.update).mockResolvedValue({...profile,displayName:'தமிழ் பெயர்',avatarId:'avatar-03'});});
describe('Stage 10.1 profile page',()=>{
 it('announces loading and displays trusted cloud account fields without internal IDs',async()=>{
  vi.mocked(profileApi.get).mockReturnValue(new Promise(()=>{}));mount();expect(screen.getByRole('status')).toHaveTextContent('Loading profile');
 });
 it('renders cloud email joined date session and existing export-only access',async()=>{
  mount();await loaded();expect(screen.getByText('a@example.invalid')).toBeVisible();expect(screen.getByText(/January.*2025/)).toBeVisible();expect(screen.getByText('Cloud Mode')).toBeVisible();
  expect(screen.queryByText('fixture-user')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Export AniVerse Data'})).toBeVisible();expect(screen.queryByRole('button',{name:/Import/})).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Save profile'})).toBeDisabled();
 });
 it('edits a Unicode name selects an avatar saves and clears dirty state',async()=>{
  const user=userEvent.setup();mount();await loaded();await user.clear(screen.getByLabelText('Display name'));await user.type(screen.getByLabelText('Display name'),'தமிழ் பெயர்');await user.click(screen.getByRole('radio',{name:'Sun avatar'}));
  expect(screen.getByRole('radio',{name:'Sun avatar'})).toBeChecked();await user.click(screen.getByRole('button',{name:'Save profile'}));
  expect(profileApi.update).toHaveBeenCalledWith({displayName:'தமிழ் பெயர்',avatarId:'avatar-03'});expect(await screen.findByRole('status')).toHaveTextContent('Profile saved');expect(screen.getByRole('button',{name:'Save profile'})).toBeDisabled();
 });
 it('validates empty and oversized display names before any mutation',async()=>{
  const user=userEvent.setup();mount();await loaded();const input=screen.getByLabelText('Display name');await user.clear(input);expect(screen.getByRole('alert')).toHaveTextContent('visible display name');expect(input).toHaveAttribute('aria-invalid','true');
  await user.type(input,'x'.repeat(41));expect(screen.getByRole('alert')).toHaveTextContent('at most 40');expect(screen.getByRole('button',{name:'Save profile'})).toBeDisabled();expect(profileApi.update).not.toHaveBeenCalled();
 });
 it('preserves input and selection on failure and allows retry',async()=>{
  vi.mocked(profileApi.update).mockRejectedValue(new Error('Unable to save your profile.'));const user=userEvent.setup();mount();await loaded();await user.clear(screen.getByLabelText('Display name'));await user.type(screen.getByLabelText('Display name'),'Keep this');await user.click(screen.getByRole('radio',{name:'Flame avatar'}));await user.click(screen.getByRole('button',{name:'Save profile'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save');expect(screen.getByLabelText('Display name')).toHaveValue('Keep this');expect(screen.getByRole('radio',{name:'Flame avatar'})).toBeChecked();expect(screen.getByRole('button',{name:'Save profile'})).toBeEnabled();
 });
 it('prevents duplicate saves while submitting',async()=>{
  vi.mocked(profileApi.update).mockReturnValue(new Promise(()=>{}));const user=userEvent.setup();mount();await loaded();await user.type(screen.getByLabelText('Display name'),' New');await user.dblClick(screen.getByRole('button',{name:'Save profile'}));expect(profileApi.update).toHaveBeenCalledTimes(1);expect(screen.getByRole('button',{name:'Saving…'})).toBeDisabled();expect(screen.getByLabelText('Display name')).toBeDisabled();
 });
 it('supports native radio keyboard navigation and selected state',async()=>{
  const user=userEvent.setup();mount();await loaded();screen.getByRole('radio',{name:'Moon avatar'}).focus();await user.keyboard('{ArrowRight}');expect(screen.getByRole('radio',{name:'Star avatar'})).toBeChecked();expect(screen.getByRole('radio',{name:'Star avatar'})).toHaveFocus();
 });
 it('shows honest local mode without cloud identity or logout',async()=>{
  auth.mode='local';vi.mocked(profileApi.get).mockResolvedValue({...profile,mode:'local',email:null,joinedAt:null});mount();await loaded();expect(screen.getByRole('heading',{name:'Local Profile'})).toBeVisible();expect(screen.getByText('Local Mode')).toBeVisible();expect(screen.getByText(/No login required/)).toBeVisible();expect(screen.queryByText('a@example.invalid')).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Sign out'})).not.toBeInTheDocument();
 });
 it('shows unavailable joined metadata without inventing a date',async()=>{
  vi.mocked(profileApi.get).mockResolvedValue({...profile,joinedAt:null});mount();await loaded();expect(screen.getByText('Unavailable')).toBeVisible();
 });
 it('reuses logout action',async()=>{
  const user=userEvent.setup();mount();await loaded();await user.click(screen.getByRole('button',{name:'Sign out'}));expect(auth.signOut).toHaveBeenCalledTimes(1);
 });
 it('clears presentation when the session expires',async()=>{
  const view=mount();await loaded();auth.user=null as never;view.rerender(<MemoryRouter><ProfilePage/></MemoryRouter>);expect(screen.getByRole('heading',{name:'Session expired'})).toBeVisible();expect(screen.getByRole('link',{name:'Sign in'})).toHaveAttribute('href','/login');expect(screen.queryByText('a@example.invalid')).not.toBeInTheDocument();
 });
 it('offers retry after a failed profile load',async()=>{
  vi.mocked(profileApi.get).mockRejectedValueOnce(new Error('network'));const user=userEvent.setup();mount();expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load');await user.click(screen.getByRole('button',{name:'Try again'}));await loaded();await waitFor(()=>expect(profileApi.get).toHaveBeenCalledTimes(2));
 });
});
