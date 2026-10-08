import { useCallback, useEffect, useState } from 'react'
import { AppIcon } from '../components/AppIcon'
import { useToast } from '../components/useToast'
import { createPaymentOrder, getPaymentPage, markPaymentNotificationRead, type PaymentPageData } from '../services/payments'
const money=(value:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(value)
const date=(value:string)=>new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))
export function PaymentsPage(){
  const [data,setData]=useState<PaymentPageData|null>(null);const [loading,setLoading]=useState(true);const [buying,setBuying]=useState('');const [error,setError]=useState('');const toast=useToast()
  const load=useCallback(async()=>{try{setData(await getPaymentPage());setError('')}catch(e){setError(e instanceof Error?e.message:'Gagal memuat pembayaran.')}finally{setLoading(false)}},[])
  useEffect(()=>{void load()},[load])
  async function buy(packageId:string){setBuying(packageId);try{const order=await createPaymentOrder(packageId);toast.info('Order pembayaran dibuat',order.message);await load()}catch(e){toast.error('Pembayaran gagal',e instanceof Error?e.message:'Coba lagi.')}finally{setBuying('')}}
  async function read(id:string){await markPaymentNotificationRead(id);setData(current=>current?{...current,notifications:current.notifications.map(item=>item.id===id?{...item,read_at:new Date().toISOString()}:item)}:current)}
  if(loading)return <section className="payments-page"><div className="generate-empty-state"><AppIcon name="sparkles"/><div><strong>Memuat pembayaran...</strong><p>Menyiapkan saldo dan paket token kamu.</p></div></div></section>
  return <section className="payments-page">
    <header className="page-header payment-hero"><div><p className="eyebrow">Token & pembayaran</p><h1>Top up token</h1><p className="page-description">Tambah token untuk memakai fitur AI Reframe. Token hanya masuk setelah pembayaran terverifikasi.</p></div><div className="payment-balance"><span>Saldo token</span><strong>{(data?.balance||0).toLocaleString('id-ID')}</strong></div></header>
    {error?<div className="integration-note integration-note-error"><AppIcon name="info"/><p>{error} Jalankan setup database token terlebih dahulu.</p></div>:null}
    <div className="payment-provider-note"><AppIcon name="info"/><div><strong>Checkout Midtrans sedang dipersiapkan</strong><p>Kamu sudah bisa memilih paket dan membuat order. Pembayaran eksternal akan aktif setelah credential Midtrans disambungkan.</p></div></div>
    <div className="token-package-grid">{data?.packages.map(pack=><article className="token-package-card" key={pack.id}><span className="subscription-badge">{pack.code}</span><h3>{pack.name}</h3><strong className="token-package-amount">{pack.token_amount.toLocaleString('id-ID')} token</strong><p>{money(pack.price_idr)}</p><button className="primary-button" disabled={buying===pack.id} onClick={()=>void buy(pack.id)}>{buying===pack.id?'Membuat order...':'Pilih paket'}</button></article>)}</div>
    <div className="payment-detail-grid"><section className="payment-panel"><div className="payment-panel-head"><h2>Notifikasi</h2><span>{data?.notifications.filter(item=>!item.read_at).length||0} baru</span></div>{data?.notifications.length?data.notifications.map(item=><button className={`payment-notification${item.read_at?' read':''}`} key={item.id} onClick={()=>void read(item.id)}><AppIcon name={item.type==='payment_success'?'check':'info'}/><span><strong>{item.title}</strong><small>{item.message}</small><time>{date(item.created_at)}</time></span></button>):<p className="payment-empty">Belum ada notifikasi pembayaran.</p>}</section>
    <section className="payment-panel"><div className="payment-panel-head"><h2>Riwayat token</h2></div>{data?.ledger.length?data.ledger.map(item=><div className="token-ledger-row" key={item.id}><div><strong>{item.description||item.kind}</strong><small>{date(item.created_at)}</small></div><span className={item.amount>0?'credit':'debit'}>{item.amount>0?'+':''}{item.amount.toLocaleString('id-ID')}</span></div>):<p className="payment-empty">Belum ada transaksi token.</p>}</section></div>
  </section>
}
