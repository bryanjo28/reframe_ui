import { buildApiHeaders, buildApiUrl } from '../config/api'
import { getCurrentAuthToken } from './authService'
import { createApiResponseError, SESSION_EXPIRED_EVENT } from '../utils/apiError'
export type TokenPackage={id:string;code:string;name:string;token_amount:number;price_idr:number}
export type PaymentOrder={id:string;amount_idr:number;token_amount:number;status:string;provider:string|null;created_at:string;paid_at:string|null;product_name?:string;product_type?:string}
export type PaymentNotification={id:string;type:string;title:string;message:string;read_at:string|null;created_at:string}
export type TokenLedgerItem={id:string;amount?:number;credits_delta?:number;balance_after:number;kind?:string;transaction_type?:string;source_type?:string|null;description?:string;created_at:string}
export type UsageHistoryItem={request_id:string;feature:string;total_tokens:number;credits_charged:number;status:string;created_at:string}
export type PaymentMethod=string
export type PaymentPageData={packages:TokenPackage[];balance:number;subscriptionBalance:number;topUpBalance:number;orders:PaymentOrder[];notifications:PaymentNotification[];ledger:TokenLedgerItem[];usageHistory:UsageHistoryItem[];paymentMethods:PaymentMethod[]}
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
  return {...data,notifications:Array.isArray(data.notifications)?data.notifications:[],ledger:Array.isArray(data.ledger)?data.ledger:[],usageHistory:Array.isArray(data.usageHistory)?data.usageHistory:[],paymentMethods:Array.isArray(data.paymentMethods)&&data.paymentMethods.length?data.paymentMethods:['qris']}
}
export type PaymentDetails={va_number:string|null;total_payment:number;expired_at:string|null;qr_string:string|null}
export type CreatedPaymentOrder={id:string;message?:string;status:string;credits:number;amount_idr:number;payment_method:string;checkoutAvailable:boolean;checkoutUrl:string|null;payment:PaymentDetails;qrImageUrl?:string|null;expiresAt?:string|null}
export type CreatePaymentOrderInput=({packageId:string;planId?:never}|{planId:string;packageId?:never})&{method:string}

export async function createPaymentOrder(
  input: CreatePaymentOrderInput
) {
  const url = buildApiUrl('/api/payments/orders');

  const requestHeaders = {
    ...headers(),
    'Content-Type': 'application/json',
  };

  const requestBody = JSON.stringify(input);

  console.log('[PAYMENT FE] REQUEST', {
    url,
    method: 'POST',
    contentType: requestHeaders['Content-Type'],
    input,
    serializedBody: requestBody,
  });

  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
      body: requestBody,
    });
  } catch (error) {
    console.error('[PAYMENT FE] FETCH FAILED', error);
    throw error;
  }

  const requestId = response.headers.get('X-Request-Id');

  console.log('[PAYMENT FE] RESPONSE', {
    status: response.status,
    ok: response.ok,
    requestId,
    contentType: response.headers.get('content-type'),
  });

  try {
    const result = await payload(response) as CreatedPaymentOrder;

    console.log('[PAYMENT FE] ORDER RESULT', {
      id: result?.id,
      status: result?.status,
    });

    return result;
  } catch (error) {
    console.error('[PAYMENT FE] ORDER ERROR', {
      requestId,
      status: response.status,
      error,
    });

    throw error;
  }
}

export async function getPaymentOrderStatus(id:string){return await payload(await fetch(buildApiUrl(`/api/payments/orders/${id}`),{headers:headers()})) as {status:string}}
export async function markPaymentNotificationRead(id:string){await payload(await fetch(buildApiUrl(`/api/payments/notifications/${id}/read`),{method:'PATCH',headers:headers()}))}

export async function getNotifications(): Promise<PaymentNotification[]> {
  const data = await payload(await fetch(buildApiUrl('/api/notifications'), { headers: headers() }))
  if (Array.isArray(data)) return data as PaymentNotification[]
  if (typeof data === 'object' && data !== null && 'notifications' in data && Array.isArray(data.notifications)) {
    return data.notifications as PaymentNotification[]
  }
  throw new Error('Respons notifikasi tidak valid.')
}
