
'use client';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';
import {
  Paperclip,
  Loader2,
  Bot,
  Image as ImageIcon,
  Send,
  User,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { fileToDataUri } from '@/lib/utils';
import { visionChat, VisionChatInput } from '@/ai/flows/vision-chat';
import { Card, CardContent } from './ui/card';
import Link from 'next/link';
import { ScrollArea } from './ui/scroll-area';
import type { Product } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

type Message = {
  role: 'user' | 'model';
  content: { text?: string; media?: { url: string }; products?: Product[] }[];
};

type ConversationState = 'initial' | 'awaiting_confirmation' | 'chatting';

export default function SimilarProductsChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState>('initial');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isCameraOpen) {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings.',
          });
          setIsCameraOpen(false);
        }
      };
      getCameraPermission();
    } else {
      // Stop camera stream when dialog is closed
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  }, [isCameraOpen, toast]);

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const handleSendMessage = async (text: string, imageUrl?: string) => {
    if (!text && !imageUrl) return;

    const userMessageContent: Message['content'] = [];
    if (text) userMessageContent.push({ text });
    if (imageUrl) userMessageContent.push({ media: { url: imageUrl } });

    const newHistory: Message[] = [...messages, { role: 'user', content: userMessageContent }];
    addMessage({ role: 'user', content: userMessageContent });

    setInput('');
    setIsLoading(true);

    try {
      const result = await visionChat({ history: newHistory as VisionChatInput['history'] });

      const modelContent: Message['content'] = [];
      if (result.response) modelContent.push({ text: result.response });
      if (result.products) modelContent.push({ products: result.products as Product[] });

      if (modelContent.length > 0) {
        addMessage({ role: 'model', content: modelContent });
      }
      setConversationState('chatting');

    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong while communicating with the AI.',
      });
      addMessage({ role: 'model', content: [{ text: "I&apos;m sorry, I encountered an error. Please try again." }] });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (dataUri: string) => {
    try {
      setIsLoading(true);
      addMessage({ role: 'user', content: [{ media: { url: dataUri } }] });
      addMessage({
        role: 'model',
        content: [{ text: 'Do you want to find similar products based on this image?' }],
      });
      setConversationState('awaiting_confirmation');
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not process the image. Please try another one.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const dataUri = await fileToDataUri(file);
      handleImageUpload(dataUri);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUri = canvas.toDataURL('image/jpeg');
        handleImageUpload(dataUri);
        setIsCameraOpen(false);
      }
    }
  };


  const handleConfirmation = (confirmed: boolean) => {
    if (confirmed) {
      handleSendMessage('yes');
    } else {
      addMessage({ role: 'user', content: [{ text: 'No' }] });
      addMessage({ role: 'model', content: [{ text: 'Alright. Feel free to ask me anything else or upload another image!' }] });
      setConversationState('chatting');
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  const InitialState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="bg-primary/10 rounded-full p-6 mb-6 border-8 border-primary/5">
        <ImageIcon className="h-16 w-16 text-primary" />
      </div>
      <h1 className="text-3xl font-bold font-headline mb-2">Visual & Conversational Search</h1>
      <p className="text-muted-foreground max-w-md mx-auto mb-6">
        Upload an image of a product, and our AI will help you find what you&apos;re looking for. Ask questions to refine your search.
      </p>
      <div className="flex gap-4">
        <Button size="lg" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
          <Paperclip className="mr-2 h-4 w-4" />
          {isLoading ? 'Processing...' : 'Upload from File'}
        </Button>
        <Button size="lg" variant="outline" onClick={() => setIsCameraOpen(true)} disabled={isLoading}>
          <Camera className="mr-2 h-4 w-4" />
          Use Camera
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex flex-col h-full w-full bg-card border rounded-lg">
        <ScrollArea className="flex-grow" ref={scrollAreaRef}>
          <div className="p-4 h-full">
            {messages.length === 0 && !isLoading && <InitialState />}

            <div className="space-y-6">
              {messages.map((msg, index) => (
                <div key={index} className={`flex flex-col gap-3 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end flex-row-reverse' : ''}`}>
                    <div className="bg-muted text-muted-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                      {msg.role === 'model' ? <Bot size={20} /> : <User size={20} />}
                    </div>
                    <div className={`p-3 rounded-lg max-w-lg ${msg.role === 'model' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                      {msg.content.map((c, i) => (
                        <div key={i}>
                          {c.text && <p className="whitespace-pre-wrap">{c.text}</p>}
                          {c.media?.url && <Image src={c.media.url} alt="Uploaded content" width={200} height={200} className="rounded-md mt-2" />}
                        </div>
                      ))}
                    </div>
                  </div>
                  {msg.content.some(c => c.products) && (
                    <div className="w-full max-w-2xl pl-12">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {msg.content.flatMap(c => c.products || []).map((product: Product) => (
                          <Link key={product.name} href={`/product/${encodeURIComponent(product.name)}`} passHref>
                            <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                              <CardContent className="p-0">
                                <div className="aspect-square relative w-full">
                                  <Image
                                    src={product.photoUrl || "https://picsum.photos/seed/product/300/300"}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                    data-ai-hint={product.photoHint}
                                  />
                                </div>
                                <div className="p-2">
                                  <h3 className="font-semibold text-xs leading-tight truncate">{product.name}</h3>
                                  <p className="text-xs text-primary font-bold mt-1">${product.price.toFixed(2)}</p>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start gap-4">
                  <div className="bg-muted text-muted-foreground rounded-full w-9 h-9 flex items-center justify-center flex-shrink-0">
                    <Bot size={22} />
                  </div>
                  <div className="p-4 bg-muted rounded-xl rounded-tl-none flex items-center">
                    <Loader2 className="animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Thinking...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="mt-auto px-4 pb-4 border-t pt-4 bg-card rounded-b-lg">
          {conversationState === 'awaiting_confirmation' ? (
            <div className="flex justify-center gap-4">
              <Button onClick={() => handleConfirmation(true)}>Yes</Button>
              <Button variant="outline" onClick={() => handleConfirmation(false)}>No</Button>
            </div>
          ) : messages.length > 0 ? (
            <form onSubmit={handleFormSubmit} className="relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a follow-up question..."
                className="pr-24"
                disabled={isLoading}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setMessages([]);
                    setConversationState('initial');
                  }}
                  disabled={isLoading}
                  title="Start over"
                >
                  <ImageIcon size={20} />
                </Button>
                <Button type="submit" size="icon" disabled={isLoading || !input}>
                  <Send size={20} />
                </Button>
              </div>
            </form>
          ) : null}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <canvas ref={canvasRef} className="hidden"></canvas>
        </div>
      </div>
      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use Camera</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <video ref={videoRef} className="w-full aspect-video rounded-md" autoPlay muted playsInline />
            {hasCameraPermission === false && (
              <Alert variant="destructive">
                <AlertTitle>Camera Access Required</AlertTitle>
                <AlertDescription>
                  Please allow camera access in your browser to use this feature.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCameraOpen(false)}>Cancel</Button>
            <Button onClick={handleCapture} disabled={!hasCameraPermission}>Capture Photo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

