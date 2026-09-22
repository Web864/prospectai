'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useState } from 'react';
import { Search, Users, Target, Send, CalendarDays, Trophy, Bookmark, BarChart3, Activity, Building2, MapPin, RotateCcw } from 'lucide-react';
import { leadListResponseSchema } from '@prospectai/validation';
import type { LeadStatus } from '@prospectai/types';
import { Badge } from './design-system';
import { Pagination } from './interactive-controls';
import { ResourceFeedback } from './resource-feedback';
import { useApiResource } from '../lib/use-api-resource';

const statusLabels: Record<LeadStatus,string>={new:'New',contacted:'Contacted',qualified:'Qualified',won:'Won',lost:'Lost',archived:'Archived'};

const cards=[
 ['Total leads','0','Saved prospects',Users],
 ['Qualified','0','High potential',Target],
 ['Contacted','0','Outreach started',Send],
 ['Meetings','0','Booked',CalendarDays],
 ['Won clients','0','Converted',Trophy],
];

export function LeadListView(){
 const [page,setPage]=useState(1); const [query,setQuery]=useState(''); const [status,setStatus]=useState<LeadStatus|'all'>('all');
 const deferredQuery=useDeferredValue(query); useEffect(()=>setPage(1),[deferredQuery,status]);
 const params=new URLSearchParams({page:String(page)}); if(deferredQuery)params.set('search',deferredQuery); if(status!=='all')params.set('status',status);
 const {state,retry}=useApiResource(`/leads?${params}`,leadListResponseSchema);
 return <>
 <div className="lead-actions"><button className="button button-secondary">⇧ Import</button><button className="button">＋ Add lead</button></div>
 <section className="lead-stats">{cards.map(([t,v,s,I])=>{const Icon=I;return <div className="lead-stat" key={t as string}><div className="lead-stat-icon"><Icon size={22}/></div><div><small>{t}</small><strong>{v}</strong><span>{s}</span></div></div>})}</section>
 <section className="lead-filter">
   <div className="lead-filter-field lead-search-field">
    <label htmlFor="lead-search"><span className="lead-filter-label">Search leads</span></label>
    <div className="lead-filter-control">
     <Search className="lead-filter-control-icon" size={20}/>
     <input id="lead-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by company name"/>
    </div>
   </div>

   <div className="lead-filter-field">
    <label htmlFor="lead-status"><span className="lead-filter-label"><Activity size={17}/>Status</span></label>
    <div className="lead-filter-control">
     <select id="lead-status" value={status} onChange={e=>setStatus(e.target.value as LeadStatus|'all')}><option value="all">All statuses</option>{Object.entries(statusLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
    </div>
   </div>

   <div className="lead-filter-field">
    <label htmlFor="lead-industry"><span className="lead-filter-label"><Building2 size={17}/>Industry</span></label>
    <div className="lead-filter-control">
     <select id="lead-industry"><option>All industries</option></select>
    </div>
   </div>

   <div className="lead-filter-field">
    <label htmlFor="lead-location"><span className="lead-filter-label"><MapPin size={17}/>Location</span></label>
    <div className="lead-filter-control">
     <select id="lead-location"><option>All locations</option></select>
    </div>
   </div>

   <button
    type="button"
    className="button button-secondary lead-clear-filters"
    onClick={() => { setQuery(''); setStatus('all'); setPage(1); }}
   >
    <RotateCcw size={17}/>Clear filters
   </button>
 </section>
 <ResourceFeedback state={state} retry={retry} notFoundTitle="Lead API is not available yet">
 {({data,meta})=>data.length===0?<div className="lead-empty"><div className="lead-empty-icon"><Search size={46}/></div><h2>No saved leads match these filters</h2><p>Saved prospects will appear here after an evidence-backed opportunity is added as a lead.</p><div><Link className="button" href="/app/research">⌕ Start research</Link><button className="button button-secondary">＋ Add lead manually</button></div><footer><span><Search/>Find opportunities</span><span><Bookmark/>Save as leads</span><span><BarChart3/>Track your progress</span></footer></div>:<section className="lead-table">{data.map(lead=><div className="lead-row" key={lead.id}><div><strong>{lead.name??lead.domain??'Unnamed lead'}</strong><span>{lead.domain}</span></div><Badge tone={lead.status==='qualified'||lead.status==='won'?'positive':'neutral'}>{statusLabels[lead.status]}</Badge><strong>{lead.opportunityScore??'--'}</strong><Link href={`/app/leads/${encodeURIComponent(lead.id)}`}>View lead</Link></div>)}{meta.totalPages>1&&<Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage}/>}</section>}
 </ResourceFeedback></>;
}
