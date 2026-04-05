
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import Link from "next/link";

const TICKETS = [
    { id: '101', subject: 'Refund Request', status: 'open', date: '2023-12-10', lastUpdate: '1 hour ago' },
    { id: '98', subject: 'Account Verification', status: 'closed', date: '2023-11-28', lastUpdate: '2 weeks ago' },
];

export function TicketList() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>My Tickets</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {TICKETS.map((ticket) => (
                        <div key={ticket.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold">#{ticket.id} - {ticket.subject}</h4>
                                    <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'}>
                                        {ticket.status}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">Last updated {ticket.lastUpdate}</p>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <Link href={`/support/${ticket.id}`}>View</Link>
                            </Button>
                        </div>
                    ))}
                    {TICKETS.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            No tickets found.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
