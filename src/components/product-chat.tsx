'use client';

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import Image from 'next/image';
import {
  Paperclip,
  Send,
  Loader2,
  Package,
  FileText,
  DollarSign,
  Bot,
  User,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { fileToDataUri } from '@/lib/utils';
import { createProductChat } from '@/ai/flows/create-product-chat';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';

type Message = {
  role: 'user' | 'model';
  content: { text?: string; media?: { url: string } }[];
};

type ProductDetails = {
    productName?: string;
    description?: string;
    price?: number;
}

export default function ProductChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [productDetails, setProductDetails] = useState<ProductDetails>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Scroll to the bottom of the chat on new messages
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
        }
    }
  }, [messages, isLoading]);
  
  useEffect(() => {
    // Initial message from the AI
    setMessages([{ role: 'model', content: [{ text: "Hello! I can help you create a new product listing. To get started, upload an image of your product or describe it to me." }] }]);
  }, []);

  const handleSendMessage = async (text: string, imageUrl?: string) => {
    if (!text && !imageUrl) return;

    const userMessageContent: { text?: string; media?: { url: string } }[] = [];
    if (text) userMessageContent.push({ text });
    if (imageUrl) userMessageContent.push({ media: { url: imageUrl } });

    const newMessages: Message[] = [...messages, { role: 'user', content: userMessageContent }];
    setMessages(newMessages);
    setInput('');
    setImagePreview(null);
    setIsLoading(true);

    try {
      const result = await createProductChat({ history: newMessages });

      if (result) {
        setMessages(prev => [...prev, { role: 'model', content: [{ text: result.response }] }]);
        // Update product details if they are returned by the AI
        let detailsUpdated = false;
        const updatedDetails: ProductDetails = {};
        if (result.productName) {
            updatedDetails.productName = result.productName;
            detailsUpdated = true;
        }
        if (result.description) {
            updatedDetails.description = result.description;
            detailsUpdated = true;
        }
        if (result.price) {
            updatedDetails.price = result.price;
            detailsUpdated = true;
        }
        
        if (detailsUpdated) {
          setProductDetails(prev => ({
            ...prev,
            ...updatedDetails
          }));
          toast({
            title: "Product Details Updated",
            description: "The AI has updated the product details.",
          });
        }
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong while communicating with the AI.',
      });
      setMessages(prev => [...prev, { role: 'model', content: [{ text: "I'm sorry, I encountered an error. Please try again." }] }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const dataUri = await fileToDataUri(file);
      setImagePreview(dataUri);
    }
     // Reset file input to allow uploading the same file again
    if(event.target){
      event.target.value = "";
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input, imagePreview || undefined);
  };
  
  const handleCreateProduct = () => {
    toast({
        title: "Product Created!",
        description: `${productDetails.productName} has been added to your inventory.`,
    });
    // Reset state for new product creation
    setProductDetails({});
    setMessages([{ role: 'model', content: [{ text: "Product created! Let's create another one. Describe your next product or upload an image." }] }]);
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden">
      <div className="lg:col-span-2 h-full flex flex-col bg-card rounded-lg border">
        <CardHeader>
           <div className="flex items-center gap-2">
            <Sparkles className="text-primary w-6 h-6" />
            <div>
                <CardTitle>AI-Powered Product Creation</CardTitle>
                <CardDescription>Chat with our AI to create a new product listing.</CardDescription>
            </div>
           </div>
        </CardHeader>
        <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'model' && (
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                    <Bot size={20} />
                  </div>
                )}
                <div className={`p-3 rounded-lg max-w-lg ${msg.role === 'model' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                  {msg.content.map((c, i) => (
                    <div key={i}>
                      {c.text && <p>{c.text}</p>}
                      {c.media?.url && <Image src={c.media.url} alt="Uploaded content" width={200} height={200} className="rounded-md mt-2" />}
                    </div>
                  ))}
                </div>
                 {msg.role === 'user' && (
                  <div className="bg-muted text-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                    <User size={20} />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-3">
                 <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                    <Bot size={20} />
                  </div>
                <div className="p-3 bg-muted rounded-lg">
                  <Loader2 className="animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-4 border-t">
          <form onSubmit={handleFormSubmit} className="relative">
            {imagePreview && (
              <div className="absolute bottom-16 left-4 p-1 bg-background border rounded-md shadow-sm">
                <Image src={imagePreview} alt="Preview" width={60} height={60} className="rounded-sm" />
                <button
                  type="button"
                  onClick={() => setImagePreview(null)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full h-5 w-5 text-xs flex items-center justify-center"
                >
                  &times;
                </button>
              </div>
            )}
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message or upload an image..."
              className="pr-24"
              disabled={isLoading}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Paperclip size={20} />
              </Button>
              <Button type="submit" size="icon" disabled={isLoading || (!input && !imagePreview)}>
                <Send size={20} />
              </Button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
          </form>
        </div>
      </div>

      <div className="lg:col-span-1 h-full">
         <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Product Details</CardTitle>
                <CardDescription>Details will be filled in as you chat with the AI.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex-grow">
                <div className="space-y-2">
                    <Label htmlFor="product-name" className='flex items-center gap-2'><Package className='w-4 h-4 text-muted-foreground' /> Name</Label>
                    <Input id="product-name" value={productDetails.productName || ''} onChange={e => setProductDetails(p => ({...p, productName: e.target.value}))} placeholder="e.g. Wireless Headphones" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="description" className='flex items-center gap-2'><FileText className='w-4 h-4 text-muted-foreground' /> Description</Label>
                    <Textarea id="description" value={productDetails.description || ''} onChange={e => setProductDetails(p => ({...p, description: e.target.value}))} placeholder="A short, catchy description..." rows={8} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="price" className='flex items-center gap-2'><DollarSign className='w-4 h-4 text-muted-foreground' /> Price</Label>
                    <Input id="price" type="number" value={productDetails.price || ''} onChange={e => setProductDetails(p => ({...p, price: Number(e.target.value)}))} placeholder="99.99" />
                </div>
            </CardContent>
             <div className='p-6 pt-0 mt-auto'>
                <Button className="w-full" onClick={handleCreateProduct} disabled={!productDetails.productName || !productDetails.description || !productDetails.price}>
                    Create Product
                </Button>
             </div>
         </Card>
      </div>
    </div>
  );
}
