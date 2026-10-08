import { buildApiHeaders, buildApiUrl } from '../config/api'
import { getCurrentAuthToken } from './authService'
export type TokenPackage={id:string;code:string;name:string;token_amount:number;price_idr:number}
export type PaymentOrder={id:string;amount_idr:number;token_amount:number;status:string;provider:string|null;created_at:string;paid_at:string|null}
export type PaymentNotification={id:string;type:string;title:string;message:string;read_at:string|null;created_at:string}
export type TokenLedgerItem={id:string;amount:number;balance_after:number;kind:string;description:string;created_at:string}
export type PaymentPageData={packages:TokenPackage[];balance:number;orders:PaymentOrder[];notifications:PaymentNotification[];ledger:TokenLedgerItem[]}
function headers(){const value=buildApiHeaders();const token=getCurrentAuthToken();if(token)value.Authorization=`Bearer ${token}`;return value}
async function payload(response:Response){const value=await response.json().catch(()=>({})) as {message?:string;data?:unknown};if(!response.ok)throw new Error(value.message||'Pembayaran belum dapat diproses.');return value.data}
export async function getPaymentPage(){return await payload(await fetch(buildApiUrl('/api/payments/me'),{headers:headers()})) as PaymentPageData}
export async function createPaymentOrder(packageId:string){return await payload(await fetch(buildApiUrl('/api/payments/orders'),{method:'POST',headers:headers(),body:JSON.stringify({packageId})})) as {id:string;message:string;checkoutAvailable:boolean}}
export async function markPaymentNotificationRead(id:string){await payload(await fetch(buildApiUrl(`/api/payments/notifications/${id}/read`),{method:'PATCH',headers:headers()}))}
