import {Flame, Flower2, Moon, Sparkles, Star, Sun, UserRound} from 'lucide-react';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {useAuth} from '../auth/AuthContext';
import {Button} from '../components/Button';
import {DataTransfer} from '../components/DataTransfer';
import {PageHeader} from '../components/PageHeader';
import {AVATARS,displayNameError,profileApi,type AvatarId,type Profile} from '../services/profileApi';

const avatarIcons = [Moon,Star,Sun,Flower2,Sparkles,Flame];
function joinedDate(value:string|null) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return 'Unavailable';
  return new Date(value).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
}

export function ProfilePage() {
  const auth=useAuth(),cloud=auth.mode==='supabase';
  const [profile,setProfile]=useState<Profile|null>(null);
  const [name,setName]=useState(''),[avatar,setAvatar]=useState<AvatarId>('avatar-01');
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null),[notice,setNotice]=useState<string|null>(null);
  const [retry,setRetry]=useState(0),[touched,setTouched]=useState(false);
  const saving=useRef(false),active=useRef(true),generation=useRef(0);
  const identity=auth.user?.id;
  useEffect(()=>{
    generation.current++;
    active.current=true;
    const controller=new AbortController();
    if(auth.loading || (cloud&&!identity)){setLoading(auth.loading);return()=>{active.current=false;controller.abort();};}
    setLoading(true);setError(null);setProfile(null);
    profileApi.get(controller.signal).then(value=>{
      if(controller.signal.aborted)return;
      setProfile(value);setName(value.displayName);setAvatar(value.avatarId);setTouched(false);
    }).catch(()=>{if(!controller.signal.aborted)setError('Unable to load your profile. Please try again.');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>{active.current=false;controller.abort();};
  },[identity,cloud,auth.loading,retry]);
  const validation=displayNameError(name),dirty=!!profile&&(name!==profile.displayName||avatar!==profile.avatarId);
  const save=async(event:FormEvent)=>{
    event.preventDefault();setTouched(true);
    if(validation||!dirty||saving.current)return;
    const scope=generation.current;
    saving.current=true;setBusy(true);setError(null);setNotice(null);
    try{
      const value=await profileApi.update({displayName:name,avatarId:avatar});
      if(active.current&&scope===generation.current){setProfile(value);setName(value.displayName);setAvatar(value.avatarId);setNotice('Profile saved.');}
    }catch(reason){if(active.current&&scope===generation.current)setError(reason instanceof Error?reason.message:'Unable to save your profile.');}
    finally{saving.current=false;if(active.current&&scope===generation.current)setBusy(false);}
  };
  if(cloud&&!auth.loading&&!auth.user)return <div className="page-shell"><PageHeader title="Session expired" description="Please sign in to view your private profile."/><Button to="/login">Sign in</Button></div>;
  if(loading)return <div className="page-shell min-h-[65vh]" role="status" aria-live="polite"><PageHeader title={cloud?'Your Profile':'Local Profile'} description="Your AniVerse identity"/><p>Loading profile…</p></div>;
  if(!profile)return <div className="page-shell"><PageHeader title={cloud?'Your Profile':'Local Profile'} description="Your AniVerse identity"/><p role="alert">{error}</p><Button onClick={()=>setRetry(value=>value+1)}>Try again</Button></div>;
  const SelectedIcon=avatarIcons[AVATARS.findIndex(item=>item.id===avatar)]??UserRound;
  return <div className="page-shell min-h-[65vh]">
    <PageHeader eyebrow="Your AniVerse space" title={cloud?'Your Profile':'Local Profile'} description={cloud?'Make your private account feel like you.':'No cloud account required. Your profile and library are stored locally.'}/>
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <section className="rounded-xl border border-outline bg-surface p-5 sm:p-7" aria-labelledby="profile-heading">
        <div className="mb-6 flex items-center gap-4"><span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-accent-secondary"><SelectedIcon size={32} aria-hidden="true"/></span><div><h2 id="profile-heading" className="text-xl font-black">Profile</h2><p className="mt-1 text-sm text-muted">Choose a name and a preset avatar.</p></div></div>
        <form onSubmit={event=>void save(event)} aria-busy={busy}>
          <label className="block text-sm font-semibold" htmlFor="display-name">Display name</label>
          <input id="display-name" value={name} disabled={busy} onChange={event=>{setName(event.target.value);setTouched(true);setNotice(null);}} aria-invalid={touched&&!!validation} aria-describedby="name-help name-error" autoComplete="nickname" className="control-surface mt-2 h-11 w-full rounded-md px-3"/>
          <p id="name-help" className="mt-2 text-xs text-muted">1–40 characters. Unicode names are welcome.</p>
          <p id="name-error" className="mt-2 text-sm text-rose-300" role={touched&&validation?'alert':undefined}>{touched?validation:null}</p>
          <fieldset disabled={busy} className="mt-7"><legend className="text-sm font-semibold">Preset avatar</legend><div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {AVATARS.map((item,index)=>{const Icon=avatarIcons[index];return <label key={item.id} className="relative cursor-pointer"><input type="radio" name="avatar" value={item.id} checked={avatar===item.id} onChange={()=>{setAvatar(item.id);setNotice(null);}} className="peer absolute right-2 top-2 z-10 h-4 w-4 accent-purple-400" aria-label={`${item.label} avatar`}/><span className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-md border border-outline bg-surface-soft px-2 py-3 text-muted peer-checked:border-accent peer-checked:text-foreground peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"><Icon size={22} aria-hidden="true"/><span className="text-xs font-semibold">{item.label}{avatar===item.id?' ✓':''}</span></span></label>;})}
          </div></fieldset>
          {error&&<p className="mt-5 text-sm text-rose-300" role="alert">{error}</p>}
          {notice&&<p className="mt-5 text-sm text-accent-secondary" role="status">{notice}</p>}
          <div className="mt-7 flex flex-wrap items-center gap-4"><Button type="submit" disabled={busy||!dirty||!!validation}>{busy?'Saving…':'Save profile'}</Button><p className="text-xs text-muted">{dirty?'Unsaved changes':'Your profile is up to date'}</p></div>
        </form>
      </section>
      <div className="space-y-6">
        <section className="rounded-xl border border-outline bg-surface p-5" aria-labelledby="account-heading"><h2 id="account-heading" className="text-lg font-bold">Account</h2>{cloud?<dl className="mt-4 space-y-4"><div><dt className="text-xs font-semibold uppercase text-muted">Email · read only</dt><dd className="mt-1 break-all">{profile.email??'Unavailable'}</dd></div><div><dt className="text-xs font-semibold uppercase text-muted">Joined</dt><dd className="mt-1">{joinedDate(profile.joinedAt)}</dd></div></dl>:<p className="mt-3 text-sm text-muted">This is a local profile, not a Supabase account. No email or cloud joined date is stored.</p>}</section>
        <section className="rounded-xl border border-outline bg-surface p-5" aria-labelledby="session-heading"><h2 id="session-heading" className="text-lg font-bold">Mode / Session</h2><p className="mt-3 font-semibold text-accent-secondary">{cloud?'Cloud Mode':'Local Mode'}</p><p className="mt-2 text-sm text-muted">{cloud?'Signed in. Your account data is private.':'No login required. Data stored locally.'}</p><div className="mt-4 flex flex-wrap gap-3"><Button to="/settings" variant="secondary">Preferences</Button>{cloud&&<Button variant="ghost" onClick={()=>void auth.signOut()}>Sign out</Button>}</div>{auth.error&&<p role="alert" className="mt-3 text-sm text-rose-300">{auth.error}</p>}</section>
        <section className="rounded-xl border border-outline bg-surface p-5" aria-labelledby="data-heading"><h2 id="data-heading" className="text-lg font-bold">Data</h2><p className="mt-3 text-sm text-muted">Download your library using the existing AniVerse backup format.</p><DataTransfer exportOnly/></section>
      </div>
    </div>
  </div>;
}
