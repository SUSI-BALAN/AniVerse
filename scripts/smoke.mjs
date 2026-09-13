const base=process.env.SMOKE_API_BASE_URL??'http://127.0.0.1:4000';
for(const name of ['health','ready','version']){
 const response=await fetch(`${base}/api/${name}`,{signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error(`${name} returned ${response.status}`);
 const body=await response.json();
 if(name==='health'&&body.status!=='ok'||name==='ready'&&body.status!=='ready'||name==='version'&&!body.data?.version)throw new Error(`${name} returned an invalid response`);
 console.log(`${name}: passed`);
}
