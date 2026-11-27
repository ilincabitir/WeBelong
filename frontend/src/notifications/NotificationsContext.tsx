import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { getUnreadCount } from '../api/notifications';

interface NotificationsValue {
  unreadCount: number;
  refreshUnread: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      setUnreadCount(await getUnreadCount());
    } catch {
      // The badge is non-critical; ignore transient failures.
    }
  }, []);

  useEffect(() => {
    void refreshUnread();

    const interval = window.setInterval(() => {
      void refreshUnread();
    }, 30_000);

    const onFocus = () => {
      void refreshUnread();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshUnread]);

  const value = useMemo(
    () => ({ unreadCount, refreshUnread }),
    [unreadCount, refreshUnread],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      'useNotifications must be used inside <NotificationsProvider>',
    );
  }
  return context;
}