'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
};

const env =
  typeof globalThis !== 'undefined'
    ? (globalThis as any).process?.env ?? {}
    : {};

const supabaseUrl =
  env.NEXT_PUBLIC_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const supabaseAnonKey =
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const hasValidSupabaseConfig =
  supabaseUrl !== 'https://YOUR_PROJECT.supabase.co' &&
  supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY';

const supabase: SupabaseClient | null = hasValidSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const SERVICES = [
  'Roof Repair',
  'Full Replacement',
  'Inspection',
  'Gutters',
  'Siding',
];

const STATUSES = ['New', 'Quoted', 'Won', 'Lost'];

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
  });

  const [lead, setLead] = useState<Lead>(createEmptyLead());
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadLeads = async () => {
    if (!supabase) return;
    setLoading(true);
    setError('');

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('date', { ascending: false });

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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        loadLeads
      )
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

    if (!supabase) {
      setLeads((prev) => [{ ...lead, id: Date.now() }, ...prev]);
      setLead(createEmptyLead());
      setError('');
      return;
    }

    const { error } = await supabase.from('leads').insert([lead]);

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
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight">
            Swirsky Roofing CRM
          </h1>
          <p className="mt-2 text-slate-600">
            Track every Facebook Organic lead, estimate, and closed roofing job.
          </p>
        </div>

        {!supabase && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            Demo mode active — add your Vercel Supabase environment keys before
            going live.
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Total Leads" value={totals.total} />
          <StatCard label="Jobs Won" value={totals.won} />
          <StatCard
            label="Revenue Closed"
            value={`$${totals.revenue.toLocaleString()}`}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-xl font-semibold">Add New Lead</h2>

            <input
              className="w-full rounded-xl border p-3"
              placeholder="Homeowner name"
              value={lead.name}
              onChange={(e) =>
                setLead((p) => ({ ...p, name: e.target.value }))
              }
            />

            <input
              className="w-full rounded-xl border p-3"
              placeholder="Phone number"
              value={lead.phone}
              onChange={(e) =>
                setLead((p) => ({ ...p, phone: e.target.value }))
              }
            />

            <input
              className="w-full rounded-xl border p-3"
              placeholder="City"
              value={lead.city}
              onChange={(e) =>
                setLead((p) => ({ ...p, city: e.target.value }))
              }
            />

            <div className="grid grid-cols-2 gap-3">
              <select
                className="rounded-xl border p-3"
                value={lead.service}
                onChange={(e) =>
                  setLead((p) => ({ ...p, service: e.target.value }))
                }
              >
                {SERVICES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>

              <select
                className="rounded-xl border p-3"
                value={lead.status}
                onChange={(e) =>
                  setLead((p) => ({ ...p, status: e.target.value }))
                }
              >
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            <input
              className="w-full rounded-xl border p-3"
              placeholder="Job value ($)"
              value={lead.value}
              onChange={(e) =>
                setLead((p) => ({ ...p, value: e.target.value }))
              }
            />

            <textarea
              className="w-full rounded-xl border p-3 min-h-28"
              placeholder="Notes from Facebook conversation / call"
              value={lead.notes}
              onChange={(e) =>
                setLead((p) => ({ ...p, notes: e.target.value }))
              }
            />

            <button
              onClick={addLead}
              className="w-full rounded-xl bg-black px-4 py-3 font-medium text-white hover:opacity-90"
            >
              Save Facebook Lead
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b p-4 font-semibold">Recent Leads</div>

            {loading ? (
              <div className="p-6">Loading leads...</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Phone</th>
                    <th className="p-3 text-left">City</th>
                    <th className="p-3 text-left">Service</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Value</th>
                  </tr>
                </thead>

                <tbody>
                  {leads.map((l, idx) => (
                    <tr key={l.id ?? idx} className="border-t">
                      <td className="p-3 font-medium">{l.name}</td>
                      <td className="p-3">{l.phone}</td>
                      <td className="p-3">{l.city}</td>
                      <td className="p-3">{l.service}</td>
                      <td className="p-3">{l.status}</td>
                      <td className="p-3">
                        ${Number(l.value || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}

                  {leads.length === 0 && (
                    <tr>
                      <td className="p-6 text-slate-500" colSpan={6}>
                        No Facebook leads yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}