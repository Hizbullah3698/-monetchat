'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BarChart, Home, Package, Users, LogOut, PlusCircle, Pencil, Trash2, MoreHorizontal, Loader2 } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/context/language-context';

interface SellerProduct {
  id: string;
  title: string;
  price: number;
  currency: string;
  status: string;
  condition: string;
  viewCount: number;
  contactCount: number;
  createdAt: string;
  images: Array<{ url: string; isPrimary: boolean }>;
  category?: { name: string; slug: string };
}

export default function SellerProductsPage() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<SellerProduct | null>(null);
  const [editForm, setEditForm] = useState({ title: '', price: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/seller/listings');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleEdit = (product: SellerProduct) => {
    setEditingProduct(product);
    setEditForm({
      title: product.title,
      price: String(product.price),
      description: '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          price: parseFloat(editForm.price),
        }),
      });

      if (res.ok) {
        toast({ title: 'Product updated' });
        setEditingProduct(null);
        fetchProducts();
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update product', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Product deleted' });
        setProducts(prev => prev.filter(p => p.id !== id));
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete product', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleMarkSold = async (id: string) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sold' }),
      });
      if (res.ok) {
        toast({ title: 'Marked as sold' });
        fetchProducts();
      }
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default' as const;
      case 'sold': return 'secondary' as const;
      case 'pending': return 'outline' as const;
      case 'rejected': return 'destructive' as const;
      default: return 'secondary' as const;
    }
  };

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
                  <SidebarMenuButton>
                    <Home className="h-5 w-5" />
                    <span>{t("dashboard.title")}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/seller/dashboard/products">
                  <SidebarMenuButton isActive>
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
            <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden" />
              <div className="w-full flex-1">
                <h1 className="text-lg font-semibold md:text-2xl">{t("dashboard.products")}</h1>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/sell/new">
                  <Button>
                    <PlusCircle className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                    {t("dashboard.addProduct")}
                  </Button>
                </Link>
              </div>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>{t("dashboard.yourProducts")}</CardTitle>
                <CardDescription>
                  {t("dashboard.manageDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">{t("dashboard.noProducts")}</h3>
                    <p className="text-muted-foreground mb-4">
                      {t("dashboard.noProductsDesc")}
                    </p>
                    <Link href="/sell/new">
                      <Button>
                        <PlusCircle className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                        {t("dashboard.createListing")}
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="hidden w-[80px] sm:table-cell">
                          <span className="sr-only">{t("common.image")}</span>
                        </TableHead>
                        <TableHead>{t("dashboard.name")}</TableHead>
                        <TableHead>{t("dashboard.status")}</TableHead>
                        <TableHead>{t("common.price")}</TableHead>
                        <TableHead className="hidden md:table-cell">{t("dashboard.views")}</TableHead>
                        <TableHead className="hidden md:table-cell">{t("dashboard.contacts")}</TableHead>
                        <TableHead>
                          <span className="sr-only">{t("dashboard.actions")}</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => {
                        const primaryImage = product.images?.find(img => img.isPrimary)?.url || product.images?.[0]?.url;
                        return (
                          <TableRow key={product.id}>
                            <TableCell className="hidden sm:table-cell">
                              {primaryImage ? (
                                <Image
                                  alt={product.title}
                                  className="aspect-square rounded-md object-cover"
                                  height={64}
                                  src={primaryImage}
                                  width={64}
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center">
                                  <Package className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {product.title}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusVariant(product.status)}>
                                {product.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {product.currency} {Number(product.price).toLocaleString()}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {product.viewCount}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {product.contactCount}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(product)}>
                                    <Pencil className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                                    {t("dashboard.edit")}
                                  </DropdownMenuItem>
                                  {product.status === 'active' && (
                                    <DropdownMenuItem onClick={() => handleMarkSold(product.id)}>
                                      <Package className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                                      {t("dashboard.markSold")}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDelete(product.id)}
                                    disabled={deletingId === product.id}
                                  >
                                    <Trash2 className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                                    {deletingId === product.id ? t("dashboard.deleting") : t("dashboard.delete")}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dashboard.editProduct")}</DialogTitle>
            <DialogDescription>{t("dashboard.editDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-title">{t("form.title")}</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-price">{t("form.price")} (KWD)</Label>
              <Input
                id="edit-price"
                type="number"
                value={editForm.price}
                onChange={(e) => setEditForm(prev => ({ ...prev, price: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>
              {t("dashboard.cancel")}
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? t("dashboard.saving") : t("dashboard.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
