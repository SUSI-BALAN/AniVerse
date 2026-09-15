import { expect, it } from 'vitest';
const luminance=(hex:string)=>hex.match(/[a-f\d]{2}/gi)!.map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
const contrast=(a:string,b:string)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
it('measures representative text, action, error, badge and focus palette contrast',()=>{
  const pairs=[
    ['body','#f5f5f7','#08080c',4.5],['muted/card episodes','#a4a4ae','#121218',4.5],
    ['link/selected navigation','#54c7dd','#121218',4.5],['primary button','#08080c','#f5f5f7',4.5],
    ['secondary button','#f5f5f7','#191920',4.5],['danger button','#08080c','#fb7185',4.5],
    ['error','#fda4af','#121218',4.5],['success','#4ade80','#121218',4.5],
    ['chip','#f5f5f7','#191920',4.5],['score badge','#fcd34d','#121218',4.5],
    ['update button','#08080c','#a970ff',4.5],['focus ring','#54c7dd','#191920',3]
  ] as const;
  const evidence=pairs.map(([name,a,b,min])=>({name,foreground:a,background:b,ratio:Number(contrast(a,b).toFixed(2)),minimum:min}));
  console.info('CONTRAST',JSON.stringify(evidence));
  for(const [name,a,b,min]of pairs)expect(contrast(a,b),name).toBeGreaterThanOrEqual(min);
});
