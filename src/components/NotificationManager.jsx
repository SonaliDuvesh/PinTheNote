import React from 'react';
import { Bell, Info, CheckCircle, AlertTriangle, X } from 'lucide-react';

export default function NotificationManager({ notifications, setNotifications }) {
  if (notifications.length === 0) return null;

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed top-5 right-5 z-[60] space-y-2.5 max-w-sm w-full pointer-events-none">
      {notifications.map((notif) => {
        // Styles based on notification type
        const typeStyles = {
          success: {
            bg: 'bg-emerald-50 dark:bg-emerald-950/80',
            border: 'border-emerald-200 dark:border-emerald-900',
            iconColor: 'text-emerald-500',
            icon: CheckCircle
          },
          error: {
            bg: 'bg-red-50 dark:bg-red-950/80',
            border: 'border-red-200 dark:border-red-900',
            iconColor: 'text-red-500',
            icon: AlertTriangle
          },
          info: {
            bg: 'bg-sky-50 dark:bg-sky-950/80',
            border: 'border-sky-200 dark:border-sky-900',
            iconColor: 'text-sky-500',
            icon: Info
          },
          alarm: {
            bg: 'bg-amber-50 dark:bg-amber-950/80',
            border: 'border-amber-200 dark:border-amber-900',
            iconColor: 'text-amber-500',
            icon: Bell
          }
        };

        const style = typeStyles[notif.type] || typeStyles.info;
        const Icon = style.icon;

        return (
          <div
            key={notif.id}
            className={`pointer-events-auto p-4 rounded-xl border shadow-lg flex items-start gap-3 transition-all duration-300 animate-in slide-in-from-right-8 ${style.bg} ${style.border}`}
          >
            <Icon size={18} className={`shrink-0 mt-0.5 ${style.iconColor}`} />
            <div className="flex-1">
              <h5 className="font-bold text-xs text-textCharcoal dark:text-white">
                {notif.title}
              </h5>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                {notif.message}
              </p>
            </div>
            <button
              onClick={() => removeNotification(notif.id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
