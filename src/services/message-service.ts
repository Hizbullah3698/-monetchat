const STORAGE_KEY = 'pickpic_mock_threads';
const MESSAGES_KEY = 'pickpic_mock_messages';

export interface Thread {
    id: string;
    participants: string[];
    lastMessage: string;
    lastMessageAt: string; // Serialized Date
    productId?: string;
}

export interface Message {
    id: string;
    threadId: string;
    senderId: string;
    text: string;
    timestamp: string;
}

const getThreads = (): Thread[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);

    // Default mocks
    const defaults = [
        {
            id: '1',
            participants: ['me', 'seller1'],
            lastMessage: 'Yes, original lens cap included.',
            lastMessageAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            productId: '1'
        }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
};

const getMessages = (threadId: string): Message[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(MESSAGES_KEY);
    let messages: Message[] = stored ? JSON.parse(stored) : [];

    // If no messages for default thread, add some
    if (threadId === '1' && !messages.some(m => m.threadId === '1')) {
        messages = [
            ...messages,
            { id: '1', threadId: '1', senderId: 'seller1', text: 'Hi! Yes, the camera is still available.', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
            { id: '2', threadId: '1', senderId: 'me', text: 'Great! Does it come with the lens cap?', timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString() },
            { id: '3', threadId: '1', senderId: 'seller1', text: 'Yes, original lens cap included.', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() }
        ];
        localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    }

    return messages.filter(m => m.threadId === threadId);
};

const saveThreads = (threads: Thread[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
};

const saveMessage = (message: Message) => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(MESSAGES_KEY);
    const messages: Message[] = stored ? JSON.parse(stored) : [];
    messages.push(message);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
};

export const messageService = {
    async createThread(sellerId: string, productId?: string): Promise<string> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const threads = getThreads();

        // Check if thread already exists
        const existingThread = threads.find(t =>
            t.participants.includes(sellerId) &&
            t.participants.includes('me') &&
            t.productId === productId
        );

        if (existingThread) {
            return existingThread.id;
        }

        // Create new thread
        const newThread: Thread = {
            id: Date.now().toString(),
            participants: ['me', sellerId],
            lastMessage: 'Started conversation',
            lastMessageAt: new Date().toISOString(),
            productId
        };

        const initialMessage: Message = {
            id: Date.now().toString(),
            threadId: newThread.id,
            senderId: 'me',
            text: 'I am interested in this item.',
            timestamp: new Date().toISOString()
        };

        saveThreads([...threads, newThread]);
        saveMessage(initialMessage);

        return newThread.id;
    },

    async getThreads(): Promise<Thread[]> {
        await new Promise(resolve => setTimeout(resolve, 300));
        return getThreads();
    },

    async getThread(threadId: string): Promise<Thread | undefined> {
        await new Promise(resolve => setTimeout(resolve, 300));
        return getThreads().find(t => t.id === threadId);
    },

    async getMessages(threadId: string): Promise<Message[]> {
        await new Promise(resolve => setTimeout(resolve, 300));
        return getMessages(threadId);
    },

    async sendMessage(threadId: string, text: string): Promise<Message> {
        await new Promise(resolve => setTimeout(resolve, 300));

        const newMessage: Message = {
            id: Date.now().toString(),
            threadId,
            senderId: 'me',
            text,
            timestamp: new Date().toISOString()
        };

        saveMessage(newMessage);

        // Update thread last message
        const threads = getThreads();
        const threadIndex = threads.findIndex(t => t.id === threadId);
        if (threadIndex !== -1) {
            threads[threadIndex] = {
                ...threads[threadIndex],
                lastMessage: text,
                lastMessageAt: newMessage.timestamp
            };
            saveThreads(threads);
        }

        return newMessage;
    }
};
