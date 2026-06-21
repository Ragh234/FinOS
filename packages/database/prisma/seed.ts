import {
  AccountType,
  ActivityType,
  BankTransactionStatus,
  BankTransactionType,
  CollectionFollowUpStatus,
  CollectionOutcome,
  CompanyRole,
  DocumentStatus,
  ForecastScenario,
  InvoiceType,
  JournalStatus,
  NotificationChannel,
  NotificationStatus,
  NormalBalance,
  PartyType,
  PaymentDirection,
  PrismaClient,
  PromiseToPayStatus,
  ReconciliationMatchStatus,
  ReconciliationStatus,
  RiskLevel,
  StockMovementType,
  UserStatus
} from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

const accountTemplate = [
  ["1000", "Cash and Bank", AccountType.ASSET, NormalBalance.DEBIT],
  ["1100", "Accounts Receivable", AccountType.ASSET, NormalBalance.DEBIT],
  ["1200", "Inventory Asset", AccountType.ASSET, NormalBalance.DEBIT],
  ["2000", "Accounts Payable", AccountType.LIABILITY, NormalBalance.CREDIT],
  ["2100", "Tax Payable", AccountType.LIABILITY, NormalBalance.CREDIT],
  ["3000", "Owner Equity", AccountType.EQUITY, NormalBalance.CREDIT],
  ["4000", "Sales Revenue", AccountType.INCOME, NormalBalance.CREDIT],
  ["5000", "Purchase Expense", AccountType.EXPENSE, NormalBalance.DEBIT],
  ["5100", "Cost of Goods Sold", AccountType.EXPENSE, NormalBalance.DEBIT]
] as const;

const demos = [
  {
    name: "Aarohan Textile Trading",
    email: "textile.demo@finos.local",
    products: ["Cotton Poplin 40s", "Rayon Printed Fabric", "Linen Blend Roll", "Denim 12oz Bale"],
    customers: ["Shree Garments", "Urban Loom Studio", "Vastra Retail LLP", "Narmada Exports"]
  },
  {
    name: "Prime Wholesale Distributor",
    email: "wholesale.demo@finos.local",
    products: ["FMCG Mixed Carton", "Rice 25kg Bag", "Cooking Oil Case", "Detergent Box"],
    customers: ["Metro Kirana Hub", "Daily Needs Mart", "Northside Traders", "Green Basket Stores"]
  },
  {
    name: "VoltEdge Electronics Supplier",
    email: "electronics.demo@finos.local",
    products: ["USB-C Adapter", "Smart LED Driver", "Router AC1200", "POS Thermal Printer"],
    customers: ["Circuit House", "RetailTech Systems", "Gadget Bazaar", "Omni Installations"]
  }
];

async function main() {
  console.log("Seeding FinOS demo tenants...");
  for (const demo of demos) {
    await seedDemo(demo);
  }
  console.log("Demo login password for all tenants: Demo@12345");
}

async function seedDemo(demo: (typeof demos)[number]) {
  const passwordHash = await argon2.hash("Demo@12345");
  const companyId = demo.email.replace(/[^a-z]/g, "_");
  const user = await prisma.user.upsert({
    where: { email: demo.email },
    update: { status: UserStatus.ACTIVE, passwordHash },
    create: { email: demo.email, name: `${demo.name} Owner`, passwordHash, status: UserStatus.ACTIVE, emailVerifiedAt: new Date() }
  });

  // Demo tenants are disposable and deterministic. Recreating only these known
  // companies makes repeated local seeding safe without touching user data.
  await prisma.auditLog.deleteMany({ where: { companyId } });
  await prisma.company.delete({ where: { id: companyId } }).catch(() => undefined);
  const company = await prisma.company.create({
    data: { id: companyId, name: demo.name, financialYearStart: new Date("2026-04-01"), currency: "INR" }
  });

  await prisma.companyMembership.upsert({
    where: { companyId_userId: { companyId: company.id, userId: user.id } },
    update: { role: CompanyRole.OWNER, isActive: true },
    create: { companyId: company.id, userId: user.id, role: CompanyRole.OWNER }
  });

  const accounts = new Map<string, { id: string }>();
  for (const [code, name, type, normalBalance] of accountTemplate) {
    const account = await prisma.account.create({
      data: { companyId: company.id, code, name, type, normalBalance, isSystem: true }
    });
    accounts.set(code, account);
  }
  const unit = await prisma.unit.create({ data: { companyId: company.id, code: "PCS", name: "Pieces" } });
  const location = await prisma.inventoryLocation.create({ data: { companyId: company.id, code: "MAIN", name: "Main Warehouse" } });
  const bankAccount = await prisma.bankAccount.create({
    data: {
      companyId: company.id,
      ledgerAccountId: accounts.get("1000")!.id,
      name: "Primary Bank",
      accountType: "CURRENT",
      institutionName: "Demo Commercial Bank",
      accountNumberMasked: "XXXX4821",
      ifscOrRoutingCode: "DEMO0001234",
      currency: "INR",
      openingBalance: 750000,
      currentBalance: 850000,
      statementBalance: 850000,
      lastSyncedAt: new Date()
    }
  });

  const parties = [];
  for (let index = 0; index < demo.customers.length; index++) {
    const customer = demo.customers[index];
    parties.push(await prisma.party.create({
      data: {
        id: `${company.id}_cust_${index}`,
        companyId: company.id,
        type: PartyType.CUSTOMER,
        name: customer,
        email: `${customer.toLowerCase().replace(/[^a-z]/g, "")}@example.com`,
        creditLimit: 250000 + index * 75000,
        riskLevel: index === 3 ? RiskLevel.HIGH : index === 2 ? RiskLevel.MEDIUM : RiskLevel.LOW,
        riskScore: index === 3 ? 78 : index === 2 ? 52 : 18
      }
    }));
  }

  const products = [];
  for (let index = 0; index < demo.products.length; index++) {
    const product = demo.products[index];
    const created = await prisma.product.create({
      data: {
        companyId: company.id,
        unitId: unit.id,
        sku: `SKU-${index + 1}`,
        name: product,
        costPrice: 600 + index * 350,
        sellingPrice: 850 + index * 520
      }
    });
    products.push(created);
    await prisma.stockBalance.create({
      data: { companyId: company.id, productId: created.id, locationId: location.id, currentStock: 120 + index * 30 }
    });
    await prisma.stockMovement.create({ data: { companyId: company.id, productId: created.id, locationId: location.id, type: StockMovementType.OPENING, quantity: 120 + index * 30, referenceType: "DemoSeed" } });
  }

  const invoices = [];
  const payments = [];
  for (let index = 0; index < 10; index++) {
    const party = parties[index % parties.length];
    const product = products[index % products.length];
    const quantity = 4 + index;
    const total = Number(product.sellingPrice) * quantity;
    const paid = index % 3 === 0 ? total : index % 3 === 1 ? total * 0.45 : 0;
    const invoice = await prisma.invoice.create({
      data: {
        companyId: company.id,
        partyId: party.id,
        type: InvoiceType.SALES,
        status: paid >= total ? DocumentStatus.PAID : paid > 0 ? DocumentStatus.PARTIAL : index > 6 ? DocumentStatus.OVERDUE : DocumentStatus.SENT,
        number: `INV-${demo.email.slice(0, 3).toUpperCase()}-${index + 1}`,
        issueDate: new Date(Date.now() - (35 - index * 3) * 86400000),
        dueDate: new Date(Date.now() - (10 - index) * 86400000),
        subtotal: total,
        total,
        amountPaid: paid,
        amountDue: total - paid,
        currency: "INR",
        lines: { create: [{ companyId: company.id, productId: product.id, description: product.name, quantity, unitPrice: product.sellingPrice, lineTotal: total }] }
      }
    });
    invoices.push(invoice);
    await prisma.journalEntry.create({
      data: {
        companyId: company.id,
        status: JournalStatus.POSTED,
        number: `JE-INV-${index + 1}`,
        entryDate: invoice.issueDate,
        memo: `Sales invoice ${invoice.number}`,
        sourceType: "SalesInvoice",
        sourceId: invoice.id,
        invoiceId: invoice.id,
        postedAt: invoice.issueDate,
        lines: {
          create: [
            { companyId: company.id, accountId: accounts.get("1100")!.id, debit: total, partyId: party.id, memo: "Accounts receivable" },
            { companyId: company.id, accountId: accounts.get("4000")!.id, credit: total, partyId: party.id, memo: "Sales revenue" }
          ]
        }
      }
    });
    await prisma.stockMovement.create({
      data: {
        companyId: company.id,
        productId: product.id,
        locationId: location.id,
        type: StockMovementType.SALES_ISSUE,
        quantity: -quantity,
        referenceType: "SalesInvoice",
        referenceId: invoice.id,
        occurredAt: invoice.issueDate,
        notes: `Demo sale ${invoice.number}`
      }
    });
    if (paid > 0) {
      const paymentDate = new Date(Date.now() - Math.max(0, 18 - index * 2) * 86400000);
      const payment = await prisma.payment.create({
        data: {
          companyId: company.id,
          partyId: party.id,
          bankAccountId: bankAccount.id,
          direction: PaymentDirection.IN,
          number: `PAY-${index + 1}`,
          paymentDate,
          amount: paid,
          method: "BANK",
          reference: `UTR-DEMO-${index + 1}`
        }
      });
      payments.push(payment);
      await prisma.paymentAllocation.create({ data: { companyId: company.id, paymentId: payment.id, invoiceId: invoice.id, amount: paid } });
      const journal = await prisma.journalEntry.create({
        data: {
          companyId: company.id,
          status: JournalStatus.POSTED,
          number: `JE-PAY-${index + 1}`,
          entryDate: paymentDate,
          memo: `Payment ${payment.number}`,
          sourceType: "Payment",
          sourceId: payment.id,
          paymentId: payment.id,
          postedAt: paymentDate,
          lines: {
            create: [
              { companyId: company.id, accountId: accounts.get("1000")!.id, debit: paid, partyId: party.id, memo: "Payment received" },
              { companyId: company.id, accountId: accounts.get("1100")!.id, credit: paid, partyId: party.id, memo: "Receivable settled" }
            ]
          }
        }
      });
      await prisma.bankTransaction.create({
        data: {
          companyId: company.id,
          bankAccountId: bankAccount.id,
          paymentId: payment.id,
          journalEntryId: journal.id,
          type: BankTransactionType.DEPOSIT,
          status: index < 4 ? BankTransactionStatus.RECONCILED : BankTransactionStatus.MATCHED,
          transactionDate: paymentDate,
          valueDate: paymentDate,
          description: `Customer receipt from ${party.name}`,
          reference: payment.reference,
          creditAmount: paid,
          runningBalance: 750000 + payments.reduce((sum, row) => sum + Number(row.amount), 0),
          counterpartyName: party.name,
          externalId: `BANK-DEMO-${index + 1}`,
          metadata: { source: "demo-seed" }
        }
      });
    }
    await prisma.collectionPrediction.create({
      data: {
        companyId: company.id,
        partyId: party.id,
        invoiceId: invoice.id,
        probability: index % 4 === 3 ? 0.35 : 0.78,
        expectedPaymentDate: new Date(Date.now() + (index + 2) * 86400000),
        expectedDelayDays: index,
        expectedAmount: total - paid,
        scenario: ForecastScenario.EXPECTED,
        modelVersion: "demo-rule-v1",
        featureSnapshot: { source: "demo" },
        reasons: ["Payment history", "Overdue age"],
        validUntil: new Date(Date.now() + 30 * 86400000)
      }
    });
  }

  for (let index = 0; index < parties.length; index++) {
    const party = parties[index];
    await prisma.creditProfile.create({
      data: {
        companyId: company.id,
        partyId: party.id,
        approvedCreditLimit: party.creditLimit,
        currentExposure: 90000 + index * 45000,
        overdueExposure: index > 1 ? 35000 + index * 10000 : 0,
        utilizationPercent: 35 + index * 22,
        riskScore: party.riskScore,
        riskLevel: party.riskLevel,
        brokenPromiseCount: index === 3 ? 2 : 0,
        creditHold: index === 3
      }
    });
    const promiseStatus = index === 3
      ? PromiseToPayStatus.BROKEN
      : index === 2
        ? PromiseToPayStatus.PARTIALLY_FULFILLED
        : index === 1
          ? PromiseToPayStatus.FULFILLED
          : PromiseToPayStatus.OPEN;
    await prisma.promiseToPay.create({
      data: {
        companyId: company.id,
        partyId: party.id,
        invoiceId: invoices[index]?.id,
        createdByUserId: user.id,
        status: promiseStatus,
        promisedAmount: 45000 + index * 15000,
        paidAmount: index === 1 ? 60000 : index === 2 ? 25000 : index === 3 ? 5000 : 0,
        promisedDate: new Date(Date.now() + (index - 1) * 86400000),
        brokenReason: index === 3 ? "Missed committed payment date" : undefined,
        brokenAt: index === 3 ? new Date() : undefined,
        fulfilledAt: index === 1 ? new Date() : undefined,
        notes: "Seeded example of the promise-to-pay lifecycle"
      }
    });
    await prisma.collectionFollowUp.create({
      data: {
        companyId: company.id,
        partyId: party.id,
        invoiceId: invoices[index]?.id,
        assignedToId: user.id,
        dueDate: new Date(Date.now() + index * 86400000),
        priority: index === 3 ? 1 : 3,
        expectedAmount: 25000 + index * 12000,
        status: index === 1 ? CollectionFollowUpStatus.COMPLETED : index === 3 ? CollectionFollowUpStatus.IN_PROGRESS : CollectionFollowUpStatus.OPEN,
        outcome: index === 1 ? CollectionOutcome.PAID : index === 3 ? CollectionOutcome.ESCALATED : undefined,
        channel: index % 2 === 0 ? NotificationChannel.EMAIL : NotificationChannel.WHATSAPP,
        notes: "Demo collection workflow",
        completedAt: index === 1 ? new Date() : undefined
      }
    });
  }

  await prisma.bankTransaction.create({
    data: {
      companyId: company.id,
      bankAccountId: bankAccount.id,
      type: BankTransactionType.FEE,
      status: BankTransactionStatus.CATEGORIZED,
      transactionDate: new Date(Date.now() - 7 * 86400000),
      description: "Monthly bank service fee",
      reference: "BANK-FEE-DEMO",
      debitAmount: 1250,
      runningBalance: 848750,
      externalId: "BANK-DEMO-FEE"
    }
  });

  const statementImport = await prisma.bankStatementImport.create({
    data: {
      companyId: company.id,
      bankAccountId: bankAccount.id,
      fileName: "demo-bank-statement.csv",
      fileHash: `demo-${company.id}`,
      source: "CSV",
      importedBy: user.id,
      metadata: { demo: true }
    }
  });
  const statementLine = await prisma.bankStatementLine.create({
    data: {
      companyId: company.id,
      bankAccountId: bankAccount.id,
      importId: statementImport.id,
      lineNumber: 1,
      transactionDate: new Date(Date.now() - 7 * 86400000),
      description: "Monthly bank service fee",
      reference: "BANK-FEE-DEMO",
      debitAmount: 1250,
      balance: 848750,
      raw: { source: "demo-bank-statement.csv", row: 1 }
    }
  });
  const feeTransaction = await prisma.bankTransaction.findUniqueOrThrow({
    where: { companyId_bankAccountId_externalId: { companyId: company.id, bankAccountId: bankAccount.id, externalId: "BANK-DEMO-FEE" } }
  });
  const reconciliation = await prisma.bankReconciliation.create({
    data: {
      companyId: company.id,
      bankAccountId: bankAccount.id,
      status: ReconciliationStatus.COMPLETED,
      periodStart: new Date(Date.now() - 30 * 86400000),
      periodEnd: new Date(),
      statementOpeningBalance: 750000,
      statementClosingBalance: 850000,
      systemOpeningBalance: 750000,
      systemClosingBalance: 850000,
      difference: 0,
      preparedBy: user.id,
      reviewedBy: user.id,
      completedAt: new Date(),
      notes: "Completed sample monthly reconciliation"
    }
  });
  await prisma.bankReconciliationMatch.create({
    data: {
      companyId: company.id,
      reconciliationId: reconciliation.id,
      bankTransactionId: feeTransaction.id,
      statementLineId: statementLine.id,
      status: ReconciliationMatchStatus.CONFIRMED,
      matchScore: 1,
      matchedAmount: 1250,
      matchedBy: user.id,
      matchedAt: new Date()
    }
  });

  const overdueTemplate = await prisma.notificationTemplate.create({
    data: {
      companyId: company.id,
      code: "overdue_invoice_reminder",
      channel: NotificationChannel.EMAIL,
      name: "Overdue invoice reminder",
      subject: "Payment reminder for {{invoiceNumber}}",
      body: "Invoice {{invoiceNumber}} is overdue. Please arrange payment.",
      variables: ["invoiceNumber"]
    }
  });
  await prisma.notificationDelivery.createMany({
    data: [
      {
        companyId: company.id,
        templateId: overdueTemplate.id,
        partyId: parties[3].id,
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.DELIVERED,
        subject: `Payment reminder for ${invoices[7].number}`,
        body: `Invoice ${invoices[7].number} is overdue. Please arrange payment.`,
        destination: parties[3].email ?? "collections@example.com",
        entityType: "Invoice",
        entityId: invoices[7].id,
        provider: "demo-email",
        providerMessageId: `demo-message-${company.id}`,
        sentAt: new Date(Date.now() - 2 * 86400000),
        deliveredAt: new Date(Date.now() - 2 * 86400000)
      },
      {
        companyId: company.id,
        recipientUserId: user.id,
        partyId: parties[3].id,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.READ,
        subject: "High-risk customer alert",
        body: `${parties[3].name} requires a credit review before new sales.`,
        destination: user.id,
        entityType: "CreditProfile",
        entityId: parties[3].id,
        provider: "in-app",
        sentAt: new Date(),
        deliveredAt: new Date(),
        readAt: new Date()
      }
    ]
  });

  await prisma.activityTimeline.createMany({
    data: [
      {
        companyId: company.id,
        partyId: parties[0].id,
        actorUserId: user.id,
        type: ActivityType.PAYMENT_RECEIVED,
        title: "Customer payment received",
        description: "Payment was allocated against an open invoice.",
        entityType: "Payment",
        entityId: payments[0]?.id ?? company.id,
        occurredAt: new Date(Date.now() - 2 * 86400000)
      },
      {
        companyId: company.id,
        partyId: parties[3].id,
        actorUserId: user.id,
        assignedToId: user.id,
        type: ActivityType.PROMISE_BROKEN,
        title: "Payment promise missed",
        description: "Collections follow-up escalated for the high-risk customer.",
        entityType: "PromiseToPay",
        entityId: parties[3].id,
        occurredAt: new Date(Date.now() - 86400000),
        dueAt: new Date()
      }
    ]
  });

  await prisma.aiConversation.create({
    data: {
      companyId: company.id,
      userId: user.id,
      title: "Weekly finance priorities",
      messages: {
        create: [
          { companyId: company.id, role: "user", content: "Which customers should collections focus on this week?" },
          {
            companyId: company.id,
            role: "assistant",
            content: `${parties[3].name} is the first collection priority because it has overdue exposure and a broken payment promise. Follow with ${parties[2].name}, which has medium credit risk and partial fulfillment.`,
            confidence: 0.84,
            citations: [
              { metric: "high_risk_customer", value: parties[3].name },
              { metric: "broken_promises", value: 1 },
              { metric: "open_invoices", value: invoices.filter((invoice) => Number(invoice.amountDue) > 0).length }
            ]
          }
        ]
      }
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => prisma.$disconnect());
