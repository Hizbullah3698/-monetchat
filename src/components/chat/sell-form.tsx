"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Car, Building2, Smartphone, Package, ArrowLeft, Loader2, ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/auth-context";

type SellCategory = "Cars" | "Real Estate" | "Electronics" | "Other" | null;

interface SellFormProps {
  onSuccess?: (product: any) => void;
  onCancel?: () => void;
}

export function SellForm({ onSuccess, onCancel }: SellFormProps) {
  const { user: authUser } = useAuth();
  
  const [category, setCategory] = useState<SellCategory>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Image State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    price: "",
    description: "",
    phone: "",
    // Cars
    brand: "",
    model: "",
    year: "",
    condition: "Good",
    // Real Estate
    propertyType: "Apartment",
    area: "",
    sizeSqm: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a valid image (JPG, PNG, WEBP)");
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) {
      setError("Please log in to publish a listing.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      let uploadedImageUrl = null;

      // 1. Upload image if selected
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || "Failed to upload image");
        }
        
        uploadedImageUrl = uploadData.url;
      }
      // Map SellCategories to backend slugs conceptually
      const categorySlugMap: Record<string, string> = {
        "Cars": "vehicles",
        "Real Estate": "property",
        "Electronics": "electronics",
        "Other": "other"
      };

      const payload = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price) || 0,
        condition: formData.condition.toLowerCase().replace(/ /g, "_"),
        currency: "KWD",
        categorySlug: category ? categorySlugMap[category] : "other",
        isNegotiable: true,
        imageUrls: uploadedImageUrl ? [uploadedImageUrl] : [], 
        // New Structured Fields
        brand: formData.brand || undefined,
        model: formData.model || undefined,
        year: formData.year ? parseInt(formData.year) : undefined,
        phone: formData.phone || undefined,
        area: formData.area || undefined,
        propertyType: formData.propertyType || undefined,
        sizeSqm: formData.sizeSqm ? parseInt(formData.sizeSqm) : undefined,
        categoryType: category || undefined
      };

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to publish listing");
      
      if (onSuccess) onSuccess(data.product);
      
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!category) {
    return (
      <ScrollArea className="h-full flex flex-col p-4 bg-gray-50/50">
        <div className="max-w-md mx-auto w-full pt-8 pb-12">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">What are you selling?</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setCategory("Cars")}
              className="flex flex-col items-center justify-center p-6 bg-white border-2 border-gray-100 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Car className="w-6 h-6 text-blue-600" />
              </div>
              <span className="font-medium text-gray-900">Cars</span>
            </button>
            <button
              onClick={() => setCategory("Real Estate")}
              className="flex flex-col items-center justify-center p-6 bg-white border-2 border-gray-100 rounded-2xl hover:border-emerald-500 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Building2 className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="font-medium text-gray-900">Real Estate</span>
            </button>
            <button
              onClick={() => setCategory("Electronics")}
              className="flex flex-col items-center justify-center p-6 bg-white border-2 border-gray-100 rounded-2xl hover:border-purple-500 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Smartphone className="w-6 h-6 text-purple-600" />
              </div>
              <span className="font-medium text-gray-900">Electronics</span>
            </button>
            <button
              onClick={() => setCategory("Other")}
              className="flex flex-col items-center justify-center p-6 bg-white border-2 border-gray-100 rounded-2xl hover:border-orange-500 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
              <span className="font-medium text-gray-900">Other</span>
            </button>
          </div>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full bg-white">
      <div className="max-w-lg mx-auto w-full p-4 pb-20">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => setCategory(null)} className="mr-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-bold">Sell {category}</h2>
        </div>

        {error && (
          <div className="p-3 mb-6 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* UNIVERSAL FIELDS */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Listing Title <span className="text-red-500">*</span></label>
            <Input 
              name="title" 
              required 
              placeholder="E.g., iPhone 14 Pro Max 256GB" 
              value={formData.title} 
              onChange={handleChange} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Price (KWD) <span className="text-red-500">*</span></label>
              <Input 
                name="price" 
                type="number" 
                required 
                placeholder="0.00" 
                value={formData.price} 
                onChange={handleChange} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number <span className="text-red-500">*</span></label>
              <Input 
                name="phone" 
                required 
                placeholder="+965 1234567" 
                value={formData.phone} 
                onChange={handleChange} 
              />
            </div>
          </div>

          {/* DYNAMIC FIELDS: CARS */}
          {category === "Cars" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Brand</label>
                  <Input name="brand" placeholder="Toyota, BMW..." value={formData.brand} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Model</label>
                  <Input name="model" placeholder="Camry, X5..." value={formData.model} onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Year</label>
                  <Input name="year" type="number" placeholder="2023" value={formData.year} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Condition</label>
                  <select 
                    name="condition"
                    value={formData.condition}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="New">New</option>
                    <option value="Used">Used</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* DYNAMIC FIELDS: REAL ESTATE */}
          {category === "Real Estate" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Property Type</label>
                  <select 
                    name="propertyType"
                    value={formData.propertyType}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="Apartment">Apartment</option>
                    <option value="Villa">Villa</option>
                    <option value="Office">Office</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Size (sqm)</label>
                  <Input name="sizeSqm" type="number" placeholder="e.g. 150" value={formData.sizeSqm} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Area / Location</label>
                <Input name="area" placeholder="Salmiya, Kuwait City..." value={formData.area} onChange={handleChange} />
              </div>
            </>
          )}

          {/* DYNAMIC FIELDS: ELECTRONICS & OTHER */}
          {(category === "Electronics" || category === "Other") && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Condition</label>
              <select 
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="New">New</option>
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea 
              name="description" 
              placeholder="Describe your item..." 
              value={formData.description} 
              onChange={handleChange}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Cover Photo <span className="text-muted-foreground text-xs font-normal ml-2">(Max 5MB)</span></label>
            
            {imagePreview ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-gray-200">
                <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-3 right-3 bg-white/90 p-1.5 rounded-full shadow-sm hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 hover:border-primary/50 hover:bg-primary/5 rounded-xl transition-all cursor-pointer bg-gray-50/50">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-2 shadow-sm border border-gray-100 text-gray-400">
                  <ImagePlus className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-gray-700 mt-2">Click to upload photo</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP</p>
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg, image/png, image/webp"
                  onChange={handleImageChange}
                />
              </label>
            )}
          </div>

          <div className="pt-4 pb-8 flex gap-3">
            <Button type="button" variant="outline" className="w-full" onClick={() => onCancel && onCancel()}>
              Cancel
            </Button>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing
                </>
              ) : (
                "Publish Listing"
              )}
            </Button>
          </div>
        </form>
      </div>
    </ScrollArea>
  );
}
