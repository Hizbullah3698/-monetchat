
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/context/language-context";

const listingSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters"),
    description: z.string().min(20, "Description must be at least 20 characters"),
    price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
    category: z.string().min(1, "Category is required"),
    condition: z.string().min(1, "Condition is required"),
});

type ListingValues = z.infer<typeof listingSchema>;

interface ListingFormProps {
    initialValues?: Partial<ListingValues>;
    onSubmit: (values: ListingValues) => void;
    isLoading?: boolean;
}

export function ListingForm({ initialValues, onSubmit, isLoading }: ListingFormProps) {
    const { t } = useLanguage();
    const form = useForm<ListingValues>({
        resolver: zodResolver(listingSchema),
        defaultValues: {
            title: "",
            description: "",
            price: "",
            category: "",
            condition: "",
            ...initialValues
        }
    });

    // Update form values when initialValues change (from AI)
    useEffect(() => {
        if (initialValues) {
            form.reset({ ...form.getValues(), ...initialValues });
        }
    }, [initialValues, form]);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("form.title")}</FormLabel>
                            <FormControl>
                                <Input placeholder={t("form.titlePlaceholder")} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("form.price")}</FormLabel>
                                <FormControl>
                                    <Input placeholder="0.00" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("form.category")}</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t("form.selectCategory")} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="vehicles">{t("category.vehicles")}</SelectItem>
                                        <SelectItem value="electronics">{t("category.electronics")}</SelectItem>
                                        <SelectItem value="property">{t("category.property")}</SelectItem>
                                        <SelectItem value="fashion">{t("category.fashion")}</SelectItem>
                                        <SelectItem value="furniture">{t("category.furniture")}</SelectItem>
                                        <SelectItem value="services">{t("category.services")}</SelectItem>
                                        <SelectItem value="jobs">{t("category.jobs")}</SelectItem>
                                        <SelectItem value="other">{t("category.other")}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="condition"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("form.condition")}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("form.selectCondition")} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="new">{t("condition.new")}</SelectItem>
                                    <SelectItem value="like-new">{t("condition.like_new")}</SelectItem>
                                    <SelectItem value="good">{t("condition.good")}</SelectItem>
                                    <SelectItem value="fair">{t("condition.fair")}</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("form.description")}</FormLabel>
                            <FormControl>
                                <Textarea placeholder={t("form.descriptionPlaceholder")} className="min-h-[100px]" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                    {t("form.createListing")}
                </Button>
            </form>
        </Form>
    );
}
