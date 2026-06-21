import { Injectable } from "@nestjs/common";
import { DocumentStatus, ForecastScenario, InvoiceType, PaymentDirection, Prisma } from "@finos/database";
import { PrismaService } from "../../shared/prisma/prisma.service";

type MetricContext = {
  receivables: number;
  overdueReceivables: number;
  collections30d: number;
  revenue30d: number;
  highRiskCustomers: number;
  brokenPromises: number;
  expectedCollections: number;
};

@Injectable()
export class AiCfoService {
  constructor(private readonly prisma: PrismaService) {}

  async ask(companyId: string, userId: string, question: string) {
    const context = await this.metrics(companyId);
    const normalized = question.toLowerCase();
    const answer = this.answer(normalized, context);
    const conversation = await this.prisma.aiConversation.create({
      data: {
        companyId,
        userId,
        title: question.slice(0, 80),
        messages: {
          create: [
            { companyId, role: "user", content: question },
            {
              companyId,
              role: "assistant",
              content: answer.content,
              confidence: answer.confidence,
              citations: answer.citations as Prisma.InputJsonValue
            }
          ]
        }
      },
      include: { messages: true }
    });
    return { conversationId: conversation.id, ...answer };
  }

  async history(companyId: string, userId: string) {
    return this.prisma.aiConversation.findMany({
      where: { companyId, userId },
      include: { messages: true },
      orderBy: { createdAt: "desc" },
      take: 25
    });
  }

  private async metrics(companyId: string): Promise<MetricContext> {
    const now = new Date();
    const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [receivables, overdue, collections, revenue, highRisk, brokenPromises, predictions] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { companyId, type: InvoiceType.SALES, status: { not: DocumentStatus.VOID }, amountDue: { gt: 0 } },
        _sum: { amountDue: true }
      }),
      this.prisma.invoice.aggregate({
        where: { companyId, type: InvoiceType.SALES, status: { not: DocumentStatus.VOID }, dueDate: { lt: now }, amountDue: { gt: 0 } },
        _sum: { amountDue: true }
      }),
      this.prisma.payment.aggregate({
        where: { companyId, direction: PaymentDirection.IN, paymentDate: { gte: since30 } },
        _sum: { amount: true }
      }),
      this.prisma.invoice.aggregate({
        where: { companyId, type: InvoiceType.SALES, status: { not: DocumentStatus.VOID }, issueDate: { gte: since30 } },
        _sum: { total: true }
      }),
      this.prisma.creditProfile.count({ where: { companyId, riskLevel: "HIGH" } }),
      this.prisma.promiseToPay.count({ where: { companyId, status: "BROKEN" } }),
      this.prisma.collectionPrediction.aggregate({
        where: { companyId, scenario: ForecastScenario.EXPECTED, validUntil: { gte: now } },
        _sum: { expectedAmount: true }
      })
    ]);
    return {
      receivables: Number(receivables._sum.amountDue ?? 0),
      overdueReceivables: Number(overdue._sum.amountDue ?? 0),
      collections30d: Number(collections._sum.amount ?? 0),
      revenue30d: Number(revenue._sum.total ?? 0),
      highRiskCustomers: highRisk,
      brokenPromises,
      expectedCollections: Number(predictions._sum.expectedAmount ?? 0)
    };
  }

  private answer(question: string, context: MetricContext) {
    const citations = [
      { metric: "open_receivables", value: context.receivables },
      { metric: "overdue_receivables", value: context.overdueReceivables },
      { metric: "collections_30d", value: context.collections30d },
      { metric: "revenue_30d", value: context.revenue30d },
      { metric: "high_risk_customers", value: context.highRiskCustomers }
    ];
    const currency = (value: number) => `INR ${Math.round(value).toLocaleString("en-IN")}`;

    if (question.includes("cash") || question.includes("cashflow")) {
      return {
        content: `Based on tenant data, recent collections are ${currency(context.collections30d)} over the last 30 days, while open receivables are ${currency(context.receivables)}. Expected collections currently total ${currency(context.expectedCollections)} from available collection predictions. Treat this as directional because bank balances and payable schedules may be incomplete.`,
        confidence: 0.74,
        citations
      };
    }
    if (question.includes("collect") || question.includes("overdue")) {
      return {
        content: `Collections should prioritize ${currency(context.overdueReceivables)} of overdue receivables, especially customers with broken promises. There are ${context.brokenPromises} broken promises and ${context.highRiskCustomers} high-risk customers in current credit profiles.`,
        confidence: 0.82,
        citations
      };
    }
    if (question.includes("risk") || question.includes("credit")) {
      return {
        content: `Credit exposure is concentrated in open receivables of ${currency(context.receivables)}. The current risk book has ${context.highRiskCustomers} high-risk customers and overdue exposure of ${currency(context.overdueReceivables)}. Review credit holds before approving additional sales.`,
        confidence: 0.8,
        citations
      };
    }
    if (question.includes("revenue") || question.includes("profit")) {
      return {
        content: `Revenue booked in the last 30 days is ${currency(context.revenue30d)}. Profit cannot be stated confidently until purchase cost and COGS postings are complete; use ledger reports for formal profitability.`,
        confidence: 0.68,
        citations
      };
    }
    return {
      content: `I can answer from tenant-scoped FinOS data. Current open receivables are ${currency(context.receivables)}, overdue receivables are ${currency(context.overdueReceivables)}, and 30-day collections are ${currency(context.collections30d)}. Ask about cashflow, collections, risk, customer exposure, or revenue for a more specific explanation.`,
      confidence: 0.7,
      citations
    };
  }
}
