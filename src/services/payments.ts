import { buildApiHeaders, buildApiUrl } from '../config/api'
import { getCurrentAuthToken } from './authService'
import { createApiResponseError, SESSION_EXPIRED_EVENT } from '../utils/apiError'
export type TokenPackage={id:string;code:string;name:string;token_amount:number;price_idr:number}
export type PaymentOrder={id:string;amount_idr:number;token_amount:number;status:string;provider:string|null;created_at:string;paid_at:string|null}
export type PaymentNotification={id:string;type:string;title:string;message:string;read_at:string|null;created_at:string}
export type TokenLedgerItem={id:string;amount?:number;credits_delta?:number;balance_after:number;kind?:string;transaction_type?:string;source_type?:string|null;description?:string;created_at:string}
export type UsageHistoryItem={request_id:string;feature:string;total_tokens:number;credits_charged:number;status:string;created_at:string}
export type PaymentPageData={packages:TokenPackage[];balance:number;subscriptionBalance:number;topUpBalance:number;orders:PaymentOrder[];notifications:PaymentNotification[];ledger:TokenLedgerItem[];usageHistory:UsageHistoryItem[]}
function headers(){const value=buildApiHeaders();const token=getCurrentAuthToken();if(token)value.Authorization=`Bearer ${token}`;return value}
async function payload(response:Response){
  const value=await response.json().catch(()=>({})) as {message?:string;data?:unknown}
  if(!response.ok){
    if(response.status===401 && getCurrentAuthToken()) window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
    throw createApiResponseError(response.status,value)
  }
  const data=value.data
  return typeof data==='object' && data!==null && 'data' in data ? data.data : data
}
export async function getPaymentPage(){
  const data=await payload(await fetch(buildApiUrl('/api/payments/me'),{headers:headers()})) as PaymentPageData
  if(!data || typeof data!=='object') throw new Error('Respons pembayaran tidak valid.')
  return {...data,notifications:Array.isArray(data.notifications)?data.notifications:[],ledger:Array.isArray(data.ledger)?data.ledger:[],usageHistory:Array.isArray(data.usageHistory)?data.usageHistory:[]}
}
export async function createPaymentOrder(packageId:string){return await payload(await fetch(buildApiUrl('/api/payments/orders'),{method:'POST',headers:headers(),body:JSON.stringify({packageId})})) as {id:string;message:string;checkoutAvailable:boolean;checkoutUrl:string|null}}
export async function markPaymentNotificationRead(id:string){await payload(await fetch(buildApiUrl(`/api/payments/notifications/${id}/read`),{method:'PATCH',headers:headers()}))}

export async function getNotifications(): Promise<PaymentNotification[]> {
  const data = await payload(await fetch(buildApiUrl('/api/notifications'), { headers: headers() }))
  if (Array.isArray(data)) return data as PaymentNotification[]
  if (typeof data === 'object' && data !== null && 'notifications' in data && Array.isArray(data.notifications)) {
    return data.notifications as PaymentNotification[]
  }
  throw new Error('Respons notifikasi tidak valid.')
}
