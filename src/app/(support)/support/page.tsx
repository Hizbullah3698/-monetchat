
"use client";

import { TicketList } from "@/components/support/ticket-list";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function SupportPage() {
    return (
        <div className="container py-8 max-w-4xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Support Center</h1>
                    <p className="text-muted-foreground">Need help? We're here for you.</p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Ticket
                </Button>
            </div>

            <div className="grid gap-8">
                <TicketList />

                <div className="grid md:grid-cols-3 gap-6">
                    <Link href="/faq" className="block p-6 border rounded-lg hover:shadow-md transition-shadow">
                        <h3 className="font-bold mb-2">FAQs</h3>
                        <p className="text-sm text-muted-foreground">Find answers to common questions.</p>
                    </Link>
                    <div className="block p-6 border rounded-lg hover:shadow-md transition-shadow">
                        <h3 className="font-bold mb-2">Live Chat</h3>
                        <p className="text-sm text-muted-foreground">Chat with our AI assistant instantly.</p>
                    </div>
                    <div className="block p-6 border rounded-lg hover:shadow-md transition-shadow">
                        <h3 className="font-bold mb-2">Email Us</h3>
                        <p className="text-sm text-muted-foreground">support@pickpic.com</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
