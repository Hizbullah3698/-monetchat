
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQS = [
    { q: "How do I sell on PickPic?", a: "Simply create an account, go to the Seller Dashboard, and click 'New Listing'. You can upload a photo and our AI will help you fill out the details." },
    { q: "Is payment secure?", a: "Yes, we use industry-standard encryption and secure payment processors to ensure your data and funds are safe." },
    { q: "Can I return items?", a: "Returns depend on the seller's policy. Check the listing details for specific return information. If an item is not as described, you are covered by our Buyer Protection." },
    { q: "How does Visual Search work?", a: "Upload an image of an item you're looking for, and our AI will find similar items listed on our marketplace." },
];

export default function FAQPage() {
    return (
        <div className="container py-12 max-w-3xl">
            <h1 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h1>
            <Accordion type="single" collapsible className="w-full">
                {FAQS.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger>{faq.q}</AccordionTrigger>
                        <AccordionContent>{faq.a}</AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
}
