import {Component,type ReactNode} from "react";
export class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){if(!this.state.failed)return this.props.children;return <main className="page-shell min-h-screen py-20"><h1 className="text-3xl font-bold">AniVerse couldn’t load this page</h1><p className="mt-4 text-muted">Reload to get the latest version, or return home.</p><div className="mt-6 flex gap-6"><button onClick={()=>window.location.reload()}>Reload</button><a href="/">Go Home</a></div></main>;}
}
