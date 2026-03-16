'use client';

import { BarChart, Home, Package, Users, DollarSign, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/context/language-context';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { salesHistory } from '@/lib/seller-data';
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

export default function SellerDashboard() {
  const { t } = useLanguage();
  const totalRevenue = salesHistory.reduce((acc, sale) => acc + sale.price * sale.quantity, 0);
  const totalSales = salesHistory.reduce((acc, sale) => acc + sale.quantity, 0);
  const uniqueCustomers = new Set(salesHistory.map(sale => sale.customerName)).size;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-muted/40">
        <Sidebar>
          <SidebarContent>
            <SidebarHeader>
              <div className="flex items-center gap-2 p-2 justify-center">
                 <Package className="h-6 w-6 text-primary" />
                 <span className="text-lg font-semibold font-headline">{t("dashboard.title")}</span>
              </div>
            </SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/seller/dashboard">
                    <SidebarMenuButton isActive>
                    <Home className="h-5 w-5" />
                    <span>{t("dashboard.title")}</span>
                    </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                 <Link href="/seller/dashboard/products">
                    <SidebarMenuButton>
                    <Package className="h-5 w-5" />
                    <span>{t("dashboard.products")}</span>
                    </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <Link href="#">
                    <SidebarMenuButton>
                    <Users className="h-5 w-5" />
                    <span>{t("dashboard.customers")}</span>
                    </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
               <SidebarMenuItem>
                 <Link href="#">
                    <SidebarMenuButton>
                    <BarChart className="h-5 w-5" />
                    <span>{t("dashboard.analytics")}</span>
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
                        <span>{t("dashboard.logout")}</span>
                    </SidebarMenuButton>
                 </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <div className="flex flex-1 flex-col">
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <div className='flex items-center gap-4'>
                <SidebarTrigger className="md:hidden" />
                <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Revenue
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    +20.1% from last month
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Sales
                  </CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+{totalSales}</div>
                  <p className="text-xs text-muted-foreground">
                    +180.1% from last month
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unique Customers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+{uniqueCustomers}</div>
                  <p className="text-xs text-muted-foreground">
                    +19% from last month
                  </p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
                <CardDescription>
                  An overview of your most recent sales.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesHistory.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          <div className="font-medium">{sale.customerName}</div>
                          <div className="text-sm text-muted-foreground">
                            {sale.customerEmail}
                          </div>
                        </TableCell>
                        <TableCell>{sale.productName}</TableCell>
                         <TableCell>
                            <Badge variant={sale.status === 'Fulfilled' ? 'default' : sale.status === 'Pending' ? 'secondary' : 'destructive'} className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                                {sale.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          ${(sale.price * sale.quantity).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
