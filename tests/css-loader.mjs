// SSR navigation tests inspect links; CSS is verified by build and browser checks.
export async function load(url,context,nextLoad){if(url.endsWith('.css'))return{format:'module',shortCircuit:true,source:'export {};'};return nextLoad(url,context);}
