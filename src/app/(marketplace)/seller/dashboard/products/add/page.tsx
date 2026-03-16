
'use client';

import Link from 'next/link';
import {
  Package,
  Home,
  Users,
  BarChart,
  LogOut,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import AiProductForm from '@/components/ai-product-form';

export default function AddProductPage() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-muted/40">
        <Sidebar>
          <SidebarContent>
            <SidebarHeader>
              <div className="flex items-center gap-2 p-2 justify-center">
                <Package className="h-6 w-6 text-primary" />
                <span className="text-lg font-semibold font-headline">
                  Seller Dashboard
                </span>
              </div>
            </SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/seller/dashboard">
                  <SidebarMenuButton>
                    <Home className="h-5 w-5" />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/seller/dashboard/products">
                  <SidebarMenuButton isActive>
                    <Package className="h-5 w-5" />
                    <span>Products</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="#">
                  <SidebarMenuButton>
                    <Users className="h-5 w-5" />
                    <span>Customers</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="#">
                  <SidebarMenuButton>
                    <BarChart className="h-5 w-5" />
                    <span>Analytics</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/">
                  <SidebarMenuButton>
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto">
           <div className="flex items-center gap-4 mb-4">
              <SidebarTrigger className="md:hidden" />
              <div className="w-full flex-1">
                  <h1 className="text-lg font-semibold md:text-2xl">Create a Product with AI</h1>
              </div>
          </div>
          <div className="max-w-3xl mx-auto w-full pb-8">
            <AiProductForm />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
