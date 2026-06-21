import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const signupSchema = loginSchema.extend({
  name: z.string().min(2),
  phone: z.string().optional()
});

export const companySchema = z.object({
  name: z.string().min(2),
  currency: z.string().default("INR"),
  financialYearStart: z.string().min(1)
});

export const customerSchema = z.object({
  name: z.string().min(2),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  creditLimit: z.coerce.number().min(0).default(0)
});

export const productSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(1),
  unitId: z.string().min(1),
  costPrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  isInventoryItem: z.boolean().default(true)
});

export const locationSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(1),
  address: z.string().optional()
});

export const invoiceSchema = z.object({
  partyId: z.string().min(1),
  issueDate: z.string().min(1),
  dueDate: z.string().optional(),
  description: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).default(0)
});

export const paymentSchema = z.object({
  partyId: z.string().min(1),
  direction: z.enum(["IN", "OUT"]),
  paymentDate: z.string().min(1),
  amount: z.coerce.number().positive(),
  method: z.string().min(1)
});

export const followUpSchema = z.object({
  partyId: z.string().min(1),
  invoiceId: z.string().optional(),
  dueDate: z.string().min(1),
  priority: z.coerce.number().min(1).max(5).default(3),
  expectedAmount: z.coerce.number().min(0).default(0),
  notes: z.string().optional()
});

export const promiseSchema = z.object({
  partyId: z.string().min(1),
  invoiceId: z.string().optional(),
  promisedAmount: z.coerce.number().positive(),
  promisedDate: z.string().min(1),
  notes: z.string().optional()
});
