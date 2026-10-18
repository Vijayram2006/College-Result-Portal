import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Bell, CheckCheck } from "lucide-react";
import { notificationsApi, NotificationInbox } from "../services/api";

/** The navbar bell: unread count, a dropdown of recent notifications, mark-as-read. Polls every 30 seconds. */
export const NotificationBell: React.FC = () => {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [inbox, setInbox] = useState<NotificationInbox>({ unread: 0, items: [] });
  const box = useRef<HTMLDivElement>(null);

  const load = () => notificationsApi.inbox().then(setInbox).catch(() => undefined);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    window.addEventListener("focus", load);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, []);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const openItem = async (id: number, link: string | null, read: boolean) => {
    if (!read) {
      await notificationsApi.markRead(id).catch(() => undefined);
      load();
    }
    if (link && link.startsWith("/admin")) {
      setOpen(false);
      navigate(link);
    }
  };

  const readAll = async () => {
    await notificationsApi.markAllRead().catch(() => undefined);
    load();
  };

  return (
    <div className="relative" ref={box}>
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        className="p-2 rounded-xl bg-[#F8F5EE] hover:bg-gray-200 text-[#0B192C] transition relative"
        aria-label={`Notifications (${inbox.unread} unread)`}
      >
        <Bell size={18} />
        {inbox.unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
            {inbox.unread > 99 ? "99+" : inbox.unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[340px] max-w-[90vw] rounded-2xl border border-[#E5E1D8] bg-white shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-[#F8F5EE]">
            <span className="text-xs font-extrabold text-[#0B192C]">
              Notifications{" "}
              <span className="ml-1 text-[10px] font-bold text-[#8A6410] bg-[#D4A72C]/15 px-2 py-0.5 rounded-md">
                {inbox.unread} unread
              </span>
            </span>
            {inbox.unread > 0 && (
              <button onClick={readAll} className="text-[10px] font-bold text-[#0B192C] hover:underline flex items-center gap-1">
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
            {inbox.items.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-gray-400 font-medium">No notifications yet.</p>
            ) : (
              inbox.items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n.id, n.link, n.read)}
                  className={`w-full text-left px-4 py-3 flex gap-2.5 hover:bg-[#F8F5EE] transition ${n.read ? "" : "bg-[#D4A72C]/5"}`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-gray-300" : "bg-[#D4A72C]"}`} />
                  <span className="min-w-0">
                    <span className={`block text-[11px] text-[#0B192C] ${n.read ? "font-semibold" : "font-extrabold"}`}>{n.title}</span>
                    <span className="block mt-0.5 text-[11px] leading-4 text-gray-500">{n.message}</span>
                    <span className="block mt-1 text-[10px] font-mono text-gray-400">{n.createdAt}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
