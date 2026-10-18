// Browser stand-in for node:crypto createHash('sha256') so the UNCHANGED engine/pulse.js runs on a static host.
function sha256hex(str){const b=new TextEncoder().encode(str),K=[];let H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
 let n=2,c=0;const f=x=>(x-Math.floor(x))*4294967296|0;while(c<64){let p=1;for(let i=2;i*i<=n;i++)if(n%i==0){p=0;break;}if(p)K[c++]=f(Math.cbrt(n));n++;}
 const l=b.length,m=new Uint8Array(((l+9+63)>>6)<<6);m.set(b);m[l]=0x80;const dv=new DataView(m.buffer);dv.setUint32(m.length-4,l*8>>>0);dv.setUint32(m.length-8,Math.floor(l/536870912));
 const r=(x,y)=>x>>>y|x<<(32-y),w=new Int32Array(64);
 for(let o=0;o<m.length;o+=64){for(let i=0;i<16;i++)w[i]=dv.getInt32(o+i*4);for(let i=16;i<64;i++){const a=w[i-15],d=w[i-2];w[i]=(r(a,7)^r(a,18)^a>>>3)+w[i-7]+(r(d,17)^r(d,19)^d>>>10)+w[i-16]|0;}
  let [A,B,C,D,E,F,G,Hh]=H;for(let i=0;i<64;i++){const t1=Hh+(r(E,6)^r(E,11)^r(E,25))+(E&F^~E&G)+K[i]+w[i]|0,t2=(r(A,2)^r(A,13)^r(A,22))+(A&B^A&C^B&C)|0;Hh=G;G=F;F=E;E=D+t1|0;D=C;C=B;B=A;A=t1+t2|0;}
  H=[A,B,C,D,E,F,G,Hh].map((v,i)=>H[i]+v|0);}
 return H.map(v=>(v>>>0).toString(16).padStart(8,'0')).join('');}
export function createHash(){let s='';const o={update(x){s+=x;return o;},digest(){return sha256hex(s);}};return o;}
