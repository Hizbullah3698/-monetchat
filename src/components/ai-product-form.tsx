
'use client';

import { useState, useRef, ChangeEvent } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload, Sparkles, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fileToDataUri } from '@/lib/utils';
import { extractProductDetails } from '@/ai/flows/extract-product-details';

export default function AiProductForm() {
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      setHasGenerated(false);
      try {
        const dataUri = await fileToDataUri(file);
        setImagePreview(dataUri);

        const result = await extractProductDetails({ photoDataUri: dataUri });

        if (result) {
          setProductName(result.productName);
          setDescription(result.description);
          toast({
            title: 'Details Extracted!',
            description: 'The product name and description have been filled in for you.',
          });
          setHasGenerated(true);
        }

      } catch (error) {
        console.error('Error during AI processing:', error);
        toast({
          variant: 'destructive',
          title: 'AI Error',
          description: 'Could not extract details from the image. Please try again.',
        });
        clearForm();
      } finally {
        setIsLoading(false);
      }
    }
    // Reset file input to allow re-uploading the same file
    if (event.target) {
      event.target.value = '';
    }
  };

  const clearForm = () => {
    setProductName('');
    setDescription('');
    setPrice('');
    setImagePreview(null);
    setHasGenerated(false);
  }

  const handleCreateProduct = () => {
    toast({
      title: 'Product Created!',
      description: `${productName} has been added to your inventory.`,
    });
    clearForm();
  }

  const isFormValid = productName && description && price && imagePreview;

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI-Powered Product Listing</CardTitle>
        <CardDescription>
          Upload a photo of your product, and let our AI generate the name and description for you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Product Image</Label>
          <div
            className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors"
            onClick={() => !isLoading && fileInputRef.current?.click()}
          >
            {isLoading ? (
              <div className="flex flex-col items-center text-center text-muted-foreground">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                <p className="font-semibold">Analyzing your image...</p>
                <p className="text-xs">This may take a moment.</p>
              </div>
            ) : imagePreview ? (
              <>
                <Image src={imagePreview} alt="Product preview" fill className="object-contain rounded-lg p-2" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearForm();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center text-center text-muted-foreground">
                <Upload className="w-10 h-10 mb-4" />
                <p className="font-semibold">Click to upload or drag & drop</p>
                <p className="text-xs">PNG, JPG, or WEBP</p>
              </div>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
            disabled={isLoading}
          />
        </div>

        {hasGenerated && (
          <div className="flex items-center justify-center p-3 bg-primary/10 rounded-md text-sm text-primary-foreground">
            <Sparkles className="h-5 w-5 mr-3 text-primary" />
            <p className='text-primary'>Don&apos;t like the results? <button onClick={() => fileInputRef.current?.click()} className="font-bold underline hover:text-primary/80">Try another image</button> or edit the fields below.</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product-name">Product Name</Label>
            <Input
              id="product-name"
              placeholder="AI will generate this..."
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              disabled={!imagePreview || isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="AI will generate this..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              disabled={!imagePreview || isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price (USD)</Label>
            <Input
              id="price"
              type="number"
              placeholder="e.g., 29.99"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={!imagePreview || isLoading}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          disabled={!isFormValid || isLoading}
          onClick={handleCreateProduct}
        >
          {isLoading ? 'Please wait...' : 'Create Product'}
        </Button>
      </CardFooter>
    </Card>
  );
}
