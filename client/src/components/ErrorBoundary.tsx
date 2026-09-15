import { Component, type ReactNode } from 'react';
import { reportClientError, supportReference } from '../services/observability';

export class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean;reference?:string}> {
  state:{failed:boolean;reference?:string}={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){
    const requestId=crypto.randomUUID();
    reportClientError({category:'render',route:location.pathname,messageCode:'RENDER_FAILED',requestId});
    this.setState({reference:supportReference(requestId)});
  }
  render(){
    if(!this.state.failed)return this.props.children;
    return <main className="page-shell min-h-screen py-20"><h1 className="text-3xl font-bold">AniVerse couldn’t load this page</h1><p className="mt-4 text-muted">Reload to get the latest version, or return home.</p>{this.state.reference&&<p role="status" className="mt-2 text-sm text-muted">Reference: {this.state.reference}</p>}<div className="mt-6 flex gap-6"><button type="button" onClick={()=>this.setState({failed:false,reference:undefined})}>Try again</button><button type="button" onClick={()=>window.location.reload()}>Reload</button><a href="/">Go Home</a></div></main>;
  }
}
