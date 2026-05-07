const A="electsim_access",R="electsim_refresh";
export const getAccessToken=()=>typeof window==="undefined"?null:localStorage.getItem(A);
export const setTokens=(a:string,r:string)=>{localStorage.setItem(A,a);localStorage.setItem(R,r);};
export const clearTokens=()=>{localStorage.removeItem(A);localStorage.removeItem(R);};
export const isAuthenticated=()=>!!getAccessToken();
