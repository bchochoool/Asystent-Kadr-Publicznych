export async function api(path,payload){
  const response=await fetch('./api/'+path,payload?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}:{});
  const data=await response.json();
  if(!response.ok){const e=new Error(data.error);e.status=response.status;throw e;}
  return data;
}
