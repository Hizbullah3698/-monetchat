
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    return (
        <div className="container py-8 max-w-4xl">
            <Button variant="ghost" className="mb-4 pl-0" asChild>
                <Link href="/support">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Support
                </Link>
            </Button>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl mb-1">Ticket #{id}</CardTitle>
                            <p className="text-muted-foreground">Subject: Refund Request</p>
                        </div>
                        <Badge>Open</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-muted p-4 rounded-lg">
                        <p className="font-semibold text-sm mb-1">You wrote:</p>
                        <p className="text-sm">I need a refund for order #12345. The item arrived damaged.</p>
                        <p className="text-xs text-muted-foreground mt-2">Dec 10, 2023 10:00 AM</p>
                    </div>

                    <div className="border border-l-4 border-l-primary p-4 rounded-lg">
                        <p className="font-semibold text-sm mb-1 text-primary">Support Agent wrote:</p>
                        <p className="text-sm">Hi there. I'm sorry to hear that. Could you please provide a photo of the damage?</p>
                        <p className="text-xs text-muted-foreground mt-2">Dec 10, 2023 11:30 AM</p>
                    </div>

                    <div className="border-t pt-4">
                        <p className="text-sm font-semibold mb-2">Reply to ticket</p>
                        <textarea
                            className="w-full min-h-[100px] p-3 rounded-md border text-sm"
                            placeholder="Type your reply..."
                        />
                        <div className="flex justify-end mt-2">
                            <Button>Send Reply</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
