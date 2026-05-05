export async function sleep(ts:number){
  return new Promise(res=>setTimeout(res,ts))
}