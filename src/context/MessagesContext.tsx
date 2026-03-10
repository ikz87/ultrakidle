import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { MESSAGES } from '../lib/messages';
import type { Message } from '../lib/messages';

interface MessagesContextType {
    unreadMessages: Message[];
    allMessages: Message[];
    readMessages: Message[];
    hasUnread: boolean;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'ultrakilldle_read_messages';

export const MessagesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [readIds, setReadIds] = useState<string[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
            try {
                setReadIds(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse read messages from localStorage', e);
            }
        }
    }, []);

    const markAsRead = (id: string) => {
        setReadIds((prev) => {
            if (prev.includes(id)) return prev;
            const next = [...prev, id];
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    };

    const markAllAsRead = () => {
        const allIds = MESSAGES.map(m => m.id);
        setReadIds(allIds);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allIds));
    };

    const unreadMessages = MESSAGES.filter(m => !readIds.includes(m.id));
    const readMessages = MESSAGES.filter(m => readIds.includes(m.id));
    const hasUnread = unreadMessages.length > 0;

    return (
        <MessagesContext.Provider
            value={{
                unreadMessages,
                allMessages: MESSAGES,
                readMessages,
                hasUnread,
                markAsRead,
                markAllAsRead,
            }}
        >
            {children}
        </MessagesContext.Provider>
    );
};

export const useMessages = () => {
    const context = useContext(MessagesContext);
    if (context === undefined) {
        throw new Error('useMessages must be used within a MessagesProvider');
    }
    return context;
};
