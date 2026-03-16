
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, User, Bot } from 'lucide-react';

interface SellerChatDialogProps {
  sellerName: string;
  children: React.ReactNode;
}

type ChatMessage = {
  role: 'user' | 'seller';
  text: string;
};

export function SellerChatDialog({ sellerName, children }: SellerChatDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'seller', text: `Hi there! I'm ${sellerName}. How can I help you today?` },
  ]);
  const [input, setInput] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages([...messages, { role: 'user', text: input }]);
    setInput('');
    
    // Simulate seller response
    setTimeout(() => {
        setMessages(prev => [...prev, { role: 'seller', text: "Thanks for your message! I'll get back to you shortly."}])
    }, 1000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] grid-rows-[auto_1fr_auto] p-0 max-h-[90vh]">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Chat with {sellerName}</DialogTitle>
          <DialogDescription>
            Ask a question about the product or arrange a meeting.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96 w-full p-6 pt-0">
            <div className="space-y-4">
                {messages.map((msg, index) => (
                <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'seller' && (
                    <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                        <Bot size={20} />
                    </div>
                    )}
                    <div className={`p-3 rounded-lg max-w-sm ${msg.role === 'seller' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                        <p>{msg.text}</p>
                    </div>
                    {msg.role === 'user' && (
                    <div className="bg-muted text-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                        <User size={20} />
                    </div>
                    )}
                </div>
                ))}
            </div>
        </ScrollArea>
        <DialogFooter className="p-6 pt-2">
          <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              autoComplete="off"
            />
            <Button type="submit" size="icon">
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    