"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listAssignees, createAssignee, updateAssignee, deleteAssignee } from '@/lib/delegation';
import type { Assignee } from '@/types/delegation';
import type { TaskCompany } from '@/types/task';

const COMPANIES: TaskCompany[] = ['AIC', 'WN', 'BXV', 'EA', 'PERSONAL'];

export default function DelegationSettingsPage() {
  const { user } = useAuth();
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState<TaskCompany | undefined>(undefined);
  const [abilities, setAbilities] = useState('');
  const [responsibilities, setResponsibilities] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const list = await listAssignees(user.uid);
        setAssignees(list);
      } catch {
        setError('Failed to load assignees');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const addAssignee = async () => {
    if (!user) return;
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await createAssignee(user.uid, {
        name: name.trim(),
        email: email.trim() || undefined,
        company,
        abilities: splitCsv(abilities),
        responsibilities: splitCsv(responsibilities),
      });
      const list = await listAssignees(user.uid);
      setAssignees(list);
      setName(''); setEmail(''); setCompany(undefined); setAbilities(''); setResponsibilities('');
    } catch {
      setError('Failed to add assignee');
    } finally {
      setLoading(false);
    }
  };

  const saveAssignee = async (a: Assignee) => {
    if (!user) return;
    try {
      await updateAssignee(user.uid, a.id, {
        name: a.name,
        email: a.email,
        company: a.company,
        abilities: a.abilities,
        responsibilities: a.responsibilities,
        notes: a.notes,
        active: a.active,
      });
    } catch {
      setError('Failed to save assignee');
    }
  };

  const removeAssignee = async (id: string) => {
    if (!user) return;
    try {
      await deleteAssignee(user.uid, id);
      setAssignees(prev => prev.filter(x => x.id !== id));
    } catch {
      setError('Failed to delete assignee');
    }
  };

  if (!user) return <div className="p-6 text-gray-600">Please sign in to manage delegation.</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Delegation Settings</h1>
        <p className="text-gray-600">Manage your assignees, their abilities, responsibilities, and company alignment.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">{error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Add Assignee</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="border rounded px-3 py-2" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Email (optional)" value={email} onChange={e => setEmail(e.target.value)} />
          <select className="border rounded px-3 py-2" value={company || ''} onChange={e => setCompany((e.target.value || undefined) as TaskCompany | undefined)}>
            <option value="">Company (optional)</option>
            {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="border rounded px-3 py-2" placeholder="Abilities (comma separated)" value={abilities} onChange={e => setAbilities(e.target.value)} />
          <input className="border rounded px-3 py-2 md:col-span-2" placeholder="Responsibilities (comma separated)" value={responsibilities} onChange={e => setResponsibilities(e.target.value)} />
        </div>
        <button onClick={addAssignee} disabled={loading} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
          {loading ? 'Saving...' : 'Add'}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-800">Assignees</h2>
        </div>
        <div className="divide-y">
          {assignees.length === 0 && (
            <div className="p-4 text-gray-500">No assignees yet.</div>
          )}
          {assignees.map((a) => (
            <div key={a.id} className="p-4 flex flex-col gap-2">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input className="border rounded px-3 py-2" value={a.name} onChange={e => setAssignees(s => s.map(x => x.id === a.id ? { ...x, name: e.target.value } : x))} />
                <input className="border rounded px-3 py-2" value={a.email || ''} onChange={e => setAssignees(s => s.map(x => x.id === a.id ? { ...x, email: e.target.value } : x))} />
                <select className="border rounded px-3 py-2" value={a.company || ''} onChange={e => setAssignees(s => s.map(x => x.id === a.id ? { ...x, company: (e.target.value || undefined) as TaskCompany | undefined } : x))}>
                  <option value="">Company</option>
                  {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={a.active} onChange={e => setAssignees(s => s.map(x => x.id === a.id ? { ...x, active: e.target.checked } : x))} /> Active
                </label>
              </div>
              <textarea className="border rounded px-3 py-2" rows={2} placeholder="Abilities (comma separated)" value={a.abilities.join(', ')} onChange={e => setAssignees(s => s.map(x => x.id === a.id ? { ...x, abilities: splitCsv(e.target.value) } : x))} />
              <textarea className="border rounded px-3 py-2" rows={2} placeholder="Responsibilities (comma separated)" value={a.responsibilities.join(', ')} onChange={e => setAssignees(s => s.map(x => x.id === a.id ? { ...x, responsibilities: splitCsv(e.target.value) } : x))} />
              <textarea className="border rounded px-3 py-2" rows={2} placeholder="Notes" value={a.notes || ''} onChange={e => setAssignees(s => s.map(x => x.id === a.id ? { ...x, notes: e.target.value } : x))} />
              <div className="flex gap-2">
                <button onClick={() => saveAssignee(a)} className="px-3 py-1.5 bg-green-600 text-white rounded">Save</button>
                <button onClick={() => removeAssignee(a.id)} className="px-3 py-1.5 bg-red-600 text-white rounded">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function splitCsv(input: string): string[] {
  return input
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}
