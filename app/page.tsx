'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type CreditStatus = 'Pending Credit' | 'Approved Credit' | 'Paid' | 'Disputed';

type Lead = {
  id?: number;
  date: string;
  name: string;
  phone: string;
  city: string;
  service: string;
  source: string;
  status: string;
  value: string;
  notes: string;
  trackingNumber: string;
  originalMessage: string;
  assignedTo: string;
  commissionRate: string;
  commissionAmount: string;
  creditStatus: CreditStatus;
};

const env = typeof globalThis !== 'undefined' ? (globalThis as any).process?.env ?? {} : {};
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const hasValidSupabaseConfig =
  supabaseUrl !== 'https://YOUR_PROJECT.supabase.co' &&
  supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY';

const supabase: SupabaseClient | null = hasValidSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const SERVICES = ['Roof Repair', 'Full Replacement', 'Inspection', 'Gutters', 'Siding'];
const STATUSES = ['New', 'Quoted', 'Won', 'Lost'];
const CREDIT_STATUSES: CreditStatus[] = ['Pending Credit', 'Approved Credit', 'Paid', 'Disputed'];

export default function Page() {
  const createEmptyLead = (): Lead => ({
    date: new Date().toISOString().slice(0, 10),
    name: '',
    phone: '',
    city: '',
    service: SERVICES[0],
    source: 'Facebook Organic',
    status: 'New',
    value: '',
    notes: '',
    trackingNumber: '(330) FB-ROOF',
    originalMessage: '',
    assignedTo: 'Office',
    commissionRate: '10',
    commissionAmount: '',
    creditStatus: 'Pending Credit',
  });

  const [lead, setLead] = useState<Lead>(createEmptyLead());
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadLeads = async () => {
    if (!supabase) return;
    setLoading(true);
    setError('');
    const { data, error } = await supabase.from('leads').select('*').order('date', { ascending: false });
    if (error) {
      setError(error.message);
      setLeads([]);
    } else {
      setLeads((data as Lead[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!supabase) return;
    loadLeads();
    const channel = supabase
      .channel('lead-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, loadLeads)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addLead = async () => {
    if (!lead.name.trim() || !lead.phone.trim()) {
      setError('Name and phone are required.');
      return;
    }

    const jobValue = Number(lead.value || 0);
    const commissionRate = Number(lead.commissionRate || 0);
    const commissionAmount = ((jobValue * commissionRate) / 100).toFixed(2);
    const payload = { ...lead, commissionAmount };

    if (!supabase) {
      setLeads((prev) => [{ ...payload, id: Date.now() }, ...prev]);
      setLead(createEmptyLead());
      setError('');
      return;
    }

    const { error } = await supabase.from('leads').insert([payload]);
    if (error) {
      setError(error.message);
      return;
    }

    setLead(createEmptyLead());
    setError('');
    loadLeads();
  };

  const totals = useMemo(
    () => ({
      total: leads.length,
      won: leads.filter((l) => l.status === 'Won').length,
      revenue: leads
        .filter((l) => l.status === 'Won')
        .reduce((sum, l) => sum + Number(l.value || 0), 0),
    }),
    [leads]
  );

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
          <h1 className="text-3xl font-bold tracking-tight">Swirsky Roofing CRM</h1>
          <p className="mt-2 text-slate-600">Track every Facebook Organic lead, estimate, and closed roofing job.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Total Leads" value={totals.total} />
          <StatCard label="Jobs Won" value={totals.won} />
          <StatCard label="Revenue Closed" value={`$${totals.revenue.toLocaleString()}`} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-xl font-semibold">Add New Lead</h2>
            <input className="w-full rounded-xl border p-3" placeholder="Homeowner name" value={lead.name} onChange={(e) => setLead((p) => ({ ...p, name: e.target.value }))} />
            <input className="w-full rounded-xl border p-3" placeholder="Phone number" value={lead.phone} onChange={(e) => setLead((p) => ({ ...p, phone: e.target.value }))} />
            <input className="w-full rounded-xl border p-3" placeholder="City" value={lead.city} onChange={(e) => setLead((p) => ({ ...p, city: e.target.value }))} />
            <input className="w-full rounded-xl border p-3" placeholder="Facebook tracking number" value={lead.trackingNumber} onChange={(e) => setLead((p) => ({ ...p, trackingNumber: e.target.value }))} />

            <div className="grid grid-cols-2 gap-3">
              <select className="rounded-xl border p-3" value={lead.service} onChange={(e) => setLead((p) => ({ ...p, service: e.target.value }))}>
                {SERVICES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select className="rounded-xl border p-3" value={lead.status} onChange={(e) => setLead((p) => ({ ...p, status: e.target.value }))}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

            <input className="w-full rounded-xl border p-3" placeholder="Job value ($)" value={lead.value} onChange={(e) => setLead((p) => ({ ...p, value: e.target.value }))} />
            <textarea className="w-full rounded-xl border p-3 min-h-24" placeholder="Original Facebook message proof" value={lead.originalMessage} onChange={(e) => setLead((p) => ({ ...p, originalMessage: e.target.value }))} />
            <textarea className="w-full rounded-xl border p-3 min-h-24" placeholder="Notes from Facebook conversation / call" value={lead.notes} onChange={(e) => setLead((p) => ({ ...p, notes: e.target.value }))} />

            <div className="grid grid-cols-2 gap-3">
              <input className="rounded-xl border p-3" placeholder="Assigned rep" value={lead.assignedTo} onChange={(e) => setLead((p) => ({ ...p, assignedTo: e.target.value }))} />
              <input className="rounded-xl border p-3" placeholder="Commission %" value={lead.commissionRate} onChange={(e) => setLead((p) => ({ ...p, commissionRate: e.target.value }))} />
            </div>

            <button onClick={addLead} className="w-full rounded-xl bg-black px-4 py-3 font-medium text-white hover:opacity-90">
              Save Facebook Lead
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl bg-white shadow-sm border border-slate-200">
            <div className="border-b p-4 font-semibold">Recent Leads + Commission Proof</div>
            {loading ? (
              <div className="p-6">Loading leads...</div>
            ) : (
              <div className="divide-y">
                {leads.map((l, idx) => (
                  <div key={l.id ?? idx} className="p-4">
                    <div className="grid grid-cols-6 gap-3 text-sm">
                      <div><div className="text-slate-500">Name</div><div className="font-semibold">{l.name}</div></div>
                      <div><div className="text-slate-500">Phone</div><div>{l.phone}</div></div>
                      <div><div className="text-slate-500">Service</div><div>{l.service}</div></div>
                      <div><div className="text-slate-500">Status</div><div>{l.status}</div></div>
                      <div><div className="text-slate-500">Job</div><div>${Number(l.value || 0).toLocaleString()}</div></div>
                      <div><div className="text-slate-500">Commission</div><div className="font-semibold text-emerald-600">${Number(l.commissionAmount || 0).toLocaleString()}</div></div>
                    </div>
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4 border border-slate-200">
                      <div className="text-sm font-semibold mb-2">Commission Proof Panel</div>
                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                        <div><span className="text-slate-500">Tracking #:</span> {l.trackingNumber}</div>
                        <div><span className="text-slate-500">Assigned:</span> {l.assignedTo}</div>
                        <div><span className="text-slate-500">Credit:</span> {l.creditStatus}</div>
                        <div><span className="text-slate-500">Source:</span> {l.source}</div>
                      </div>
                      {l.originalMessage && (
                        <div className="mt-3 text-sm">
                          <div className="text-slate-500">Original FB Message</div>
                          <div className="mt-1 rounded-xl bg-white p-3 border">{l.originalMessage}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {leads.length === 0 && <div className="p-6 text-slate-500">No Facebook leads yet</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}
