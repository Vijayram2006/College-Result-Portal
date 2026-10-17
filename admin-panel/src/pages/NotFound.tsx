import React from "react";
import { Link } from "wouter";

/** Shown for an address that is not a page of the COE panel. */
export const NotFoundPage: React.FC = () => (
  <div className="min-h-screen bg-[#F8F5EE] flex items-center justify-center p-6">
    <div className="max-w-md text-center space-y-4">
      <img src="/kvell-logo.png" alt="KVELL University" className="mx-auto h-16 w-16 rounded-full bg-white p-1 border-2 border-[#D4A72C]" />
      <p className="text-5xl font-black text-[#0B192C]">404</p>
      <h1 className="text-lg font-black text-[#0B192C]">This page does not exist</h1>
      <p className="text-sm text-slate-600">The address may be mistyped, or the page has moved.</p>
      <Link href="/admin/dashboard" className="inline-block rounded-xl bg-[#0B192C] px-5 py-2.5 text-xs font-bold text-white">
        Go to the COE dashboard
      </Link>
    </div>
  </div>
);
