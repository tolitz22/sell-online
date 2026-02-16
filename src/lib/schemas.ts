import { z } from "zod";

export const paymentStatuses = ["PENDING_PROOF", "PAID", "CANCELLED"] as const;

export const orderSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(999),
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(6, "Phone is required"),
  address: z.string().min(5, "Delivery address is required").max(300, "Address is too long"),
  notes: z.string().max(500).optional().default(""),
});

export const updateStatusSchema = z.object({
  paymentStatus: z.enum(paymentStatuses),
});

export const productStatuses = ["AVAILABLE", "SOLD_OUT"] as const;

export const createProductSchema = z.object({
  name: z.string().min(2, "Item name is required"),
  category: z.string().min(2, "Category is required"),
  price: z.coerce.number().positive("Price must be greater than 0"),
  description: z.string().min(5, "Description is required").max(500, "Description is too long"),
  status: z.enum(productStatuses).default("AVAILABLE"),
  imageUrl: z.string().trim().optional().default(""),
});

export type OrderInput = z.infer<typeof orderSchema>;
export type PaymentStatus = (typeof paymentStatuses)[number];
export type ProductStatusInput = (typeof productStatuses)[number];
