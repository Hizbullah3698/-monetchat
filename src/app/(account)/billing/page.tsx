
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check } from "lucide-react";

export default function BillingPage() {
    return (
        <div className="container py-8 max-w-5xl">
            <h1 className="text-3xl font-bold mb-8">Billing & Usage</h1>

            {/* Usage Stats (Quota) */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
                <Card>
                    <CardHeader>
                        <CardTitle>Current Plan: Professional</CardTitle>
                        <CardDescription>Billed $29/mo annually</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Active Listings</span>
                                <span>24 / 50</span>
                            </div>
                            <Progress value={48} className="h-2" />
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>AI Image Scans</span>
                                <span>89 / 500</span>
                            </div>
                            <Progress value={18} className="h-2" />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline">Manage Subscription</Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Next Invoice</CardTitle>
                        <CardDescription>Automatic payment on Jan 1, 2026</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold mb-2">$29.00</div>
                        <p className="text-sm text-muted-foreground">Includes tax and fees.</p>
                    </CardContent>
                    <CardFooter>
                        <Button variant="link" className="px-0">View All Invoices</Button>
                    </CardFooter>
                </Card>
            </div>

            {/* Plans */}
            <h2 className="text-2xl font-bold mb-6">Available Plans</h2>
            <div className="grid md:grid-cols-3 gap-6">
                {[
                    { name: 'Starter', price: '$0', features: ['5 Listings', 'Basic Analytics', 'Community Support'] },
                    { name: 'Professional', price: '$29', features: ['50 Listings', 'Advanced Analytics', 'Priority Support', 'AI Vision Search'], popular: true },
                    { name: 'Enterprise', price: '$99', features: ['Unlimited Listings', 'API Access', 'Dedicated Account Manager', 'Custom Branding'] },
                ].map((plan) => (
                    <Card key={plan.name} className={plan.popular ? "border-primary shadow-lg relative" : ""}>
                        {plan.popular && (
                            <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                                POPULAR
                            </div>
                        )}
                        <CardHeader>
                            <CardTitle>{plan.name}</CardTitle>
                            <div className="text-3xl font-bold mt-2">{plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-center text-sm">
                                        <Check className="mr-2 h-4 w-4 text-green-500" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                                {plan.name === 'Professional' ? 'Current Plan' : 'Upgrade'}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
