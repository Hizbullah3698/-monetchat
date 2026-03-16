
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, Facebook, Linkedin, Instagram, MessageSquare } from 'lucide-react';

const footerLinks = {
    categories: [
        { name: 'Automotive', href: '#' },
        { name: 'Electronics', href: '#' },
        { name: 'Services', href: '#' },
        { name: 'Sports', href: '#' },
        { name: 'Family', href: '#' },
        { name: 'Furniture', href: '#' },
        { name: 'Education', href: '#' },
        { name: 'Property', href: '#' },
        { name: 'Contracting', href: '#' },
        { name: 'Camping', href: '#' },
        { name: 'Animals', href: '#' },
        { name: 'Gifts', href: '#' },
        { name: 'Jobs', href: '#' },
        { name: 'Others', href: '#' },
    ],
    myAccount: [
        { name: 'Account Information', href: '#' },
        { name: 'My Listings', href: '#' },
        { name: 'My Favorites', href: '#' },
        { name: 'My Payments', href: '#' },
        { name: 'Followers', href: '#' },
        { name: 'Seller Dashboard', href: '/seller/dashboard' },
        { name: 'Seller Login', href: '/seller/login' },
        { name: 'Seller Signup', href: '/seller/signup' },
    ],
    information: [
        { name: 'About Us', href: '#' },
        { name: 'Terms & Conditions', href: '#' },
        { name: 'Frequently Asked Questions', href: '#' },
        { name: 'Privacy & Cookie Policy', href: '#' },
        { name: 'Blog', href: '#' },
        { name: 'Prayer times', href: '#' },
        { name: 'Weather', href: '#' },
    ]
}

const socialLinks = [
    { icon: <Facebook className="h-5 w-5" />, href: '#', name: 'Facebook' },
    { icon: <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current"><title>X</title><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83-8.209-9.214h7.49l5.226 6.62L18.901 1.153Zm-1.61 19.98h2.554L7.546 2.3h-2.83l12.585 18.832Z"></path></svg>, href: '#', name: 'X' },
    { icon: <Linkedin className="h-5 w-5" />, href: '#', name: 'LinkedIn' },
    { icon: <Instagram className="h-5 w-5" />, href: '#', name: 'Instagram' },
    { icon: <MessageSquare className="h-5 w-5" />, href: '#', name: 'WhatsApp' }, // Using MessageSquare for WhatsApp
    { icon: <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current"><title>TikTok</title><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.74-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"></path></svg>, href: '#', name: 'TikTok' },
];

export function Footer() {
    return (
        <footer className="bg-background text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-t">
            <div className="bg-primary/5 dark:bg-primary/10">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex flex-wrap justify-between items-center">
                        <div className="w-full md:w-auto text-center md:text-left mb-4 md:mb-0">
                            <h3 className="font-bold text-lg text-primary">We&apos;re Always Here to Help</h3>
                            <p className="text-sm text-muted-foreground">Reach out to us through any of these support channels</p>
                        </div>
                        <div className="w-full md:w-auto flex flex-col sm:flex-row sm:items-center sm:gap-8 justify-center">
                            <div className="flex items-center gap-3 mb-2 sm:mb-0">
                                <div className="bg-primary/10 rounded-full p-2">
                                    <Mail className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Email Support</p>
                                    <a href="mailto:support@ecomm.com" className="font-semibold text-foreground hover:text-primary">support@ecomm.com</a>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="bg-primary/10 rounded-full p-2">
                                    <Phone className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Phone Support</p>
                                    <a href="tel:9899454545" className="font-semibold text-foreground hover:text-primary">9899454545</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div>
                        <h3 className="text-2xl font-bold text-primary mb-4">Ecomm Now</h3>
                        <p className="text-sm mb-4 text-muted-foreground">Buy and sell everything from cars, electronics, property and more on Ecomm Now.</p>
                        <p className="text-sm mb-4 text-muted-foreground">Download Ecomm Now on iOS and Android and make Buying & Selling easy everywhere you go!</p>
                        <p className="font-semibold mb-2">Download our app</p>
                        <div className="flex gap-2">
                            <Link href="#">
                                <Image src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" width={135} height={40} />
                            </Link>
                            <Link href="#">
                                <Image src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="Download on the App Store" width={120} height={40} />
                            </Link>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4">Categories</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            {footerLinks.categories.map(link => (
                                <Link key={link.name} href={link.href} className="text-muted-foreground hover:text-primary hover:underline">{link.name}</Link>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4">My Account</h4>
                        <ul className="space-y-2 text-sm">
                            {footerLinks.myAccount.map(link => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-muted-foreground hover:text-primary hover:underline">{link.name}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4">Information</h4>
                        <ul className="space-y-2 text-sm">
                            {footerLinks.information.map(link => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-muted-foreground hover:text-primary hover:underline">{link.name}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="border-t">
                <div className="container mx-auto px-6 py-4 flex flex-wrap justify-between items-center text-sm">
                    <p className="text-muted-foreground mb-4 md:mb-0">&copy; All Rights Reserved by Ecomm Now 2025</p>
                    <div className="flex gap-2">
                        {socialLinks.map(social => (
                            <Link key={social.name} href={social.href} className="text-muted-foreground hover:text-primary bg-muted/50 p-2 rounded-full">
                                {social.icon}
                                <span className="sr-only">{social.name}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}

