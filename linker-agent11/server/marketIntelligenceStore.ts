import { prisma } from './prisma';

export type PurchaseMethod = 'direct' | 'broker' | 'mixed' | 'local';

export interface SurveyResponseData {
  platforms?: string;
  preferredPlatform?: string;
  purchaseMethod?: PurchaseMethod;
  purchaseMethodRaw?: string;
  brokerType?: string;
  brokerSource?: string;
  brokerName?: string;
  brokerPlatform?: string;
  brokerReason?: string;
  deliveryTime?: string;
  cashOnDelivery?: string;
  hasProblems?: boolean;
  mainProblem?: string;
  orderValue?: string;
  purchaseFrequency?: string;
  city?: string;
  ageGroup?: string;
  gender?: string;
  paymentPreference?: string;
  canceledBefore?: boolean;
  cancelReason?: string;
  biggestAnnoyance?: string;
  directPurchaseProb?: string;
  directEncouragement?: string;
  directHesitation?: string;
  refusalReason?: string;
}

export interface CustomerProfile {
  name?: string;
  city?: string;
}

export interface CompleteSurveyArgs {
  campaignId: string;
  customerId: string;
  phone: string;
  rawChatLog: string;
  data: SurveyResponseData;
}

export interface SurveySession {
  customerId: string;
}

export interface SystemEventInput {
  level: 'info' | 'warn' | 'error';
  type: string;
  route?: string;
  customer?: string;
  campaign?: string;
  session?: string;
  message?: string;
  reason?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface WhatsappMessageInput {
  providerMessageId?: string;
  direction: 'inbound' | 'outbound';
  phone: string;
  campaignId?: string;
  sessionId?: string;
  status: 'received' | 'sent' | 'failed' | 'duplicate';
  text?: string;
  error?: string;
  payload?: Record<string, unknown>;
}

type SurveyResponseFieldData = Partial<{
  platforms: string | null;
  preferredPlatform: string | null;
  purchaseMethod: string | null;
  purchaseMethodRaw: string | null;
  brokerType: string | null;
  brokerSource: string | null;
  brokerName: string | null;
  brokerPlatform: string | null;
  brokerReason: string | null;
  deliveryTime: string | null;
  cashOnDelivery: string | null;
  hasProblems: boolean | null;
  mainProblem: string | null;
  orderValue: string | null;
  purchaseFrequency: string | null;
  ageGroup: string | null;
  gender: string | null;
  paymentPreference: string | null;
  canceledBefore: boolean | null;
  cancelReason: string | null;
  biggestAnnoyance: string | null;
  directPurchaseProb: string | null;
  directEncouragement: string | null;
  directHesitation: string | null;
  refusalReason: string | null;
}>;

interface CompletedResponse {
  id: string;
  campaignId: string;
  customerId: string;
  platforms: string | null;
  preferredPlatform: string | null;
  purchaseMethod: string | null;
  purchaseMethodRaw: string | null;
  brokerType: string | null;
  brokerSource: string | null;
  brokerName: string | null;
  brokerPlatform: string | null;
  brokerReason: string | null;
  deliveryTime: string | null;
  cashOnDelivery: string | null;
  hasProblems: boolean | null;
  mainProblem: string | null;
  orderValue: string | null;
  purchaseFrequency: string | null;
  ageGroup: string | null;
  gender: string | null;
  paymentPreference: string | null;
  canceledBefore: boolean | null;
  cancelReason: string | null;
  biggestAnnoyance: string | null;
  directPurchaseProb: string | null;
  directEncouragement: string | null;
  directHesitation: string | null;
  refusalReason: string | null;
  rawChatLog: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  customer: { id: string; phone: string; name: string | null; city: string | null };
}

interface CountDatum {
  name: string;
  value: number;
}

const DEFAULT_CAMPAIGN_NAME = 'Market Intelligence Survey';

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

function isPresent(value: string | undefined | null): value is string {
  return Boolean(value && value.trim().length > 0);
}

function pickResponseData(data: SurveyResponseData): SurveyResponseFieldData {
  return {
    platforms: data.platforms,
    preferredPlatform: data.preferredPlatform,
    purchaseMethod: data.purchaseMethod,
    purchaseMethodRaw: data.purchaseMethodRaw,
    brokerType: data.brokerType,
    brokerSource: data.brokerSource,
    brokerName: data.brokerName,
    brokerPlatform: data.brokerPlatform,
    brokerReason: data.brokerReason,
    deliveryTime: data.deliveryTime,
    cashOnDelivery: data.cashOnDelivery,
    hasProblems: data.hasProblems,
    mainProblem: data.mainProblem,
    orderValue: data.orderValue,
    purchaseFrequency: data.purchaseFrequency,
    ageGroup: data.ageGroup,
    gender: data.gender,
    paymentPreference: data.paymentPreference,
    canceledBefore: data.canceledBefore,
    cancelReason: data.cancelReason,
    biggestAnnoyance: data.biggestAnnoyance,
    directPurchaseProb: data.directPurchaseProb,
    directEncouragement: data.directEncouragement,
    directHesitation: data.directHesitation,
    refusalReason: data.refusalReason,
  };
}

function ratio(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function countBy<T>(items: T[], getKey: (item: T) => string | null | undefined): CountDatum[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    const rawKey = getKey(item);
    const key = isPresent(rawKey) ? rawKey.trim() : 'غير محدد';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value);
}

function primaryPlatform(response: CompletedResponse): string {
  const source = response.preferredPlatform ?? response.platforms;
  if (!isPresent(source)) {
    return 'غير محدد';
  }

  return source.split(/[,،\n]/)[0]?.trim() || source.trim();
}

function isPositiveDirectProbability(value: string | null) {
  if (!value) {
    return false;
  }

  return ['أكيد', 'غالب', 'احتمال كبير', '1', '2'].some((keyword) => value.includes(keyword));
}

async function getCompletedResponses(): Promise<CompletedResponse[]> {
  return prisma.surveyResponse.findMany({
    where: { status: 'completed' },
    orderBy: { updatedAt: 'desc' },
    include: { customer: true },
  });
}

async function recalculatePlatformBrokerRatio(platformName: string) {
  const total = await prisma.surveyResponse.count({
    where: { status: 'completed', preferredPlatform: platformName },
  });
  const broker = await prisma.surveyResponse.count({
    where: { status: 'completed', preferredPlatform: platformName, purchaseMethod: 'broker' },
  });

  await prisma.marketPlatform.update({
    where: { normalizedName: normalizeName(platformName) },
    data: { brokerDepRatio: ratio(broker, total) },
  });
}

export const MarketIntelligenceStore = {
  async logSystemEvent(input: SystemEventInput) {
    const event = {
      ...input,
      at: new Date().toISOString(),
    };

    if (!process.env.DATABASE_URL) {
      console[input.level === 'error' ? 'error' : input.level === 'warn' ? 'warn' : 'log']('[system-event]', event);
      return null;
    }

    try {
      return await prisma.systemEventLog.create({
        data: {
          level: input.level,
          type: input.type,
          route: input.route,
          customer: input.customer,
          campaign: input.campaign,
          session: input.session,
          message: input.message,
          reason: input.reason,
          action: input.action,
          metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
        },
      });
    } catch (error) {
      console.error('[system-event-log-failed]', event, error);
      return null;
    }
  },

  async logWhatsappMessage(input: WhatsappMessageInput) {
    const payload = input.payload ? JSON.parse(JSON.stringify(input.payload)) : undefined;

    if (!process.env.DATABASE_URL) {
      console.log('[whatsapp-message]', {
        ...input,
        payload: payload ? '[payload]' : undefined,
        at: new Date().toISOString(),
      });
      return null;
    }

    try {
      if (input.providerMessageId) {
        return await prisma.whatsappMessage.upsert({
          where: { providerMessageId: input.providerMessageId },
          update: {
            status: input.status,
            error: input.error,
            text: input.text,
            payload,
          },
          create: {
            providerMessageId: input.providerMessageId,
            direction: input.direction,
            phone: input.phone,
            campaignId: input.campaignId,
            sessionId: input.sessionId,
            status: input.status,
            text: input.text,
            error: input.error,
            payload,
          },
        });
      }

      return await prisma.whatsappMessage.create({
        data: {
          direction: input.direction,
          phone: input.phone,
          campaignId: input.campaignId,
          sessionId: input.sessionId,
          status: input.status,
          text: input.text,
          error: input.error,
          payload,
        },
      });
    } catch (error) {
      console.error('[whatsapp-message-log-failed]', { ...input, payload: payload ? '[payload]' : undefined }, error);
      return null;
    }
  },

  async hasProcessedWhatsappMessage(providerMessageId: string) {
    if (!process.env.DATABASE_URL) return false;
    const existing = await prisma.whatsappMessage.findUnique({
      where: { providerMessageId },
      select: { id: true },
    });
    return Boolean(existing);
  },

  async ensureCampaign(campaignId: string, name = DEFAULT_CAMPAIGN_NAME) {
    return prisma.surveyCampaign.upsert({
      where: { id: campaignId },
      update: { status: 'active' },
      create: {
        id: campaignId,
        name,
        status: 'active',
      },
    });
  },

  async upsertCustomer(phone: string, profile: CustomerProfile = {}) {
    return prisma.surveyCustomer.upsert({
      where: { phone },
      update: {
        ...(profile.name && { name: profile.name }),
        ...(profile.city && { city: profile.city }),
        lastContactedAt: new Date(),
      },
      create: {
        phone,
        name: profile.name,
        city: profile.city,
        lastContactedAt: new Date(),
      },
    });
  },

  async prepareSurveySession(phone: string, campaignId: string, profile: CustomerProfile = {}): Promise<SurveySession> {
    await this.ensureCampaign(campaignId);
    const customer = await this.upsertCustomer(phone, profile);

    return { customerId: customer.id };
  },

  async logRawChat(campaignId: string, customerId: string, rawChatLog: string) {
    await this.ensureCampaign(campaignId);

    return prisma.surveyResponse.upsert({
      where: {
        campaignId_customerId: {
          campaignId,
          customerId,
        },
      },
      update: {
        rawChatLog,
        status: 'in_progress',
      },
      create: {
        campaignId,
        customerId,
        rawChatLog,
        status: 'in_progress',
      },
    });
  },

  async logBrokerMention(brokerName: string, associatedCity?: string, platform?: string, brokerType?: string) {
    const normalizedName = normalizeName(brokerName);
    const existing = await prisma.marketBroker.findUnique({
      where: { normalizedName },
    });

    let platformsObj: string[] = [];
    if (existing?.platforms) {
      try {
        const parsed = JSON.parse(existing.platforms) as unknown;
        platformsObj = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
      } catch (error) {
        console.warn('[market-broker-platforms]', error);
      }
    }

    if (platform && !platformsObj.includes(platform)) {
      platformsObj.push(platform);
    }

    let citiesObj: string[] = [];
    if (existing?.coverageCities) {
      try {
        const parsed = JSON.parse(existing.coverageCities) as unknown;
        citiesObj = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
      } catch { /* ignore */ }
    }
    if (associatedCity && !citiesObj.includes(associatedCity)) {
      citiesObj.push(associatedCity);
    }

    if (!existing && brokerType) {
      return prisma.marketBroker.create({
        data: {
          name: brokerName,
          normalizedName,
          type: brokerType,
          gender: brokerType === 'individual_female' ? 'female' : brokerType === 'individual_male' ? 'male' : 'unknown',
          channel: brokerType === 'instagram_store' ? 'Instagram' : brokerType === 'whatsapp_seller' ? 'WhatsApp' : brokerType === 'telegram_seller' ? 'Telegram' : brokerType === 'tiktok_seller' ? 'TikTok' : brokerType === 'local_store' ? 'Local' : 'Other',
          associatedCity,
          coverageCities: citiesObj.length > 0 ? JSON.stringify(citiesObj) : null,
          platforms: JSON.stringify(platformsObj),
          mentionCount: 1,
        },
      });
    }

    return prisma.marketBroker.upsert({
      where: { normalizedName },
      update: {
        mentionCount: { increment: 1 },
        ...(associatedCity && { associatedCity }),
        ...(brokerType && !existing?.type && { type: brokerType }),
        ...(brokerType && !existing?.channel && { channel: brokerType === 'instagram_store' ? 'Instagram' : brokerType === 'whatsapp_seller' ? 'WhatsApp' : brokerType === 'telegram_seller' ? 'Telegram' : brokerType === 'tiktok_seller' ? 'TikTok' : brokerType === 'local_store' ? 'Local' : 'Other' }),
        platforms: JSON.stringify(platformsObj),
        coverageCities: citiesObj.length > 0 ? JSON.stringify(citiesObj) : undefined,
      },
      create: {
        name: brokerName,
        normalizedName,
        type: brokerType || 'unknown',
        gender: brokerType === 'individual_female' ? 'female' : brokerType === 'individual_male' ? 'male' : 'unknown',
        channel: brokerType === 'instagram_store' ? 'Instagram' : brokerType === 'whatsapp_seller' ? 'WhatsApp' : brokerType === 'telegram_seller' ? 'Telegram' : brokerType === 'tiktok_seller' ? 'TikTok' : brokerType === 'local_store' ? 'Local' : 'Other',
        associatedCity,
        coverageCities: citiesObj.length > 0 ? JSON.stringify(citiesObj) : null,
        platforms: JSON.stringify(platformsObj),
        mentionCount: 1,
      },
    });
  },

  async logPlatformUsage(platformName: string, purchaseMethod?: string, hasProblems?: boolean) {
    const normalizedName = normalizeName(platformName);
    const update: { usageCount: { increment: number }; problemScore?: { increment: number } } = {
      usageCount: { increment: 1 },
    };

    if (hasProblems) {
      update.problemScore = { increment: 1 };
    }

    await prisma.marketPlatform.upsert({
      where: { normalizedName },
      update,
      create: {
        name: platformName,
        normalizedName,
        usageCount: 1,
        problemScore: hasProblems ? 1 : 0,
        brokerDepRatio: purchaseMethod === 'broker' ? 100 : 0,
      },
    });

    await recalculatePlatformBrokerRatio(platformName);
  },

  async completeSurveyResponse(responseId: string, extractedData: SurveyResponseData) {
    return prisma.surveyResponse.update({
      where: { id: responseId },
      data: {
        ...pickResponseData(extractedData),
        status: 'completed',
      },
    });
  },

  async completeSurvey(args: CompleteSurveyArgs) {
    await this.ensureCampaign(args.campaignId);
    const customer = await this.upsertCustomer(args.phone, { city: args.data.city });
    const effectiveCustomerId = args.customerId === customer.id ? args.customerId : customer.id;
    const responseData = pickResponseData(args.data);

    const response = await prisma.surveyResponse.upsert({
      where: {
        campaignId_customerId: {
          campaignId: args.campaignId,
          customerId: effectiveCustomerId,
        },
      },
      update: {
        ...responseData,
        rawChatLog: args.rawChatLog,
        status: 'completed',
      },
      create: {
        campaignId: args.campaignId,
        customerId: effectiveCustomerId,
        ...responseData,
        rawChatLog: args.rawChatLog,
        status: 'completed',
      },
    });

    if (isPresent(args.data.brokerName)) {
      await this.logBrokerMention(args.data.brokerName, args.data.city, args.data.brokerPlatform ?? args.data.preferredPlatform, args.data.brokerType);
    }

    if (isPresent(args.data.preferredPlatform)) {
      await this.logPlatformUsage(args.data.preferredPlatform, args.data.purchaseMethod, args.data.hasProblems);
    }

    return response;
  },

  async getDashboardMetrics() {
    const completedResponses = await getCompletedResponses();
    const totalResponses = completedResponses.length;
    const brokerDependency = completedResponses.filter((response) => response.purchaseMethod === 'broker').length;
    const directProbability = completedResponses.filter((response) =>
      isPositiveDirectProbability(response.directPurchaseProb),
    ).length;

    const allBrokers = (await prisma.marketBroker.findMany({
      orderBy: { mentionCount: 'desc' },
    })) as { type: string | null; channel: string | null; gender: string | null }[];

    const topBrokers = allBrokers.slice(0, 5);

    return {
      totalResponses,
      brokerDependencyRatio: ratio(brokerDependency, totalResponses),
      topBrokers,
      allBrokers,
      directProbabilityRatio: ratio(directProbability, totalResponses),
      recentResponses: completedResponses.slice(0, 10),
      platformBreakdown: countBy(completedResponses, primaryPlatform),
      cityBreakdown: countBy(completedResponses, (response) => response.customer.city),
      problemBreakdown: countBy(completedResponses, (response) => response.mainProblem),
      paymentPreferenceBreakdown: countBy(completedResponses, (response) => response.paymentPreference),
      purchaseMethodBreakdown: countBy(completedResponses, (response) => response.purchaseMethod),
      ageGroupBreakdown: countBy(completedResponses, (response) => response.ageGroup),
      genderBreakdown: countBy(completedResponses, (response) => response.gender),
      brokerTypeBreakdown: countBy(allBrokers, (b) => b.type),
      brokerChannelBreakdown: countBy(allBrokers, (b) => b.channel),
      brokerGenderBreakdown: countBy(allBrokers.filter((b) => b.gender && b.gender !== 'unknown'), (b) => b.gender),
    };
  },

  async getAnalyticsSnapshot() {
    const metrics = await this.getDashboardMetrics();

    return {
      generatedAt: new Date().toISOString(),
      dashboard: metrics,
      platforms: {
        marketShare: metrics.platformBreakdown,
      },
      brokers: {
        dependencyRatio: metrics.brokerDependencyRatio,
        topBrokers: metrics.topBrokers,
        typeBreakdown: metrics.brokerTypeBreakdown,
        channelBreakdown: metrics.brokerChannelBreakdown,
        genderBreakdown: metrics.brokerGenderBreakdown,
      },
      consumers: {
        paymentPreferences: metrics.paymentPreferenceBreakdown,
        purchaseMethods: metrics.purchaseMethodBreakdown,
        ageGroups: metrics.ageGroupBreakdown,
        genders: metrics.genderBreakdown,
      },
      cities: {
        activity: metrics.cityBreakdown,
      },
      problems: {
        mainProblems: metrics.problemBreakdown,
      },
    };
  },

  async getAllResponses() {
    return prisma.surveyResponse.findMany({
      include: {
        customer: true,
        campaign: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  },

  async bulkUpsertCustomers(records: { phone: string; name?: string; city?: string }[]) {
    const results = { created: 0, updated: 0, skipped: 0, duplicates: 0 };

    const deduped = new Map<string, { phone: string; name?: string; city?: string }>();
    for (const record of records) {
      const phone = record.phone?.trim();
      if (!phone) { results.skipped++; continue; }
      if (deduped.has(phone)) { results.duplicates++; continue; }
      deduped.set(phone, { phone, name: record.name?.trim(), city: record.city?.trim() });
    }

    for (const [, record] of deduped) {
      const existing = await prisma.surveyCustomer.findUnique({ where: { phone: record.phone } });
      if (existing) {
        await prisma.surveyCustomer.update({
          where: { phone: record.phone },
          data: {
            ...(record.name && !existing.name && { name: record.name }),
            ...(record.city && !existing.city && { city: record.city }),
          },
        });
        results.updated++;
      } else {
        await prisma.surveyCustomer.create({ data: { phone: record.phone, name: record.name, city: record.city } });
        results.created++;
      }
    }

    return results;
  },

  async getAllBrokers() {
    return prisma.marketBroker.findMany({ orderBy: { mentionCount: 'desc' } });
  },

  async rejectSurvey(campaignId: string, customerId: string, phone: string, rawChatLog: string) {
    await this.ensureCampaign(campaignId);
    await this.upsertCustomer(phone);

    return prisma.surveyResponse.upsert({
      where: { campaignId_customerId: { campaignId, customerId } },
      update: { rawChatLog, status: 'abandoned' },
      create: { campaignId, customerId, rawChatLog, status: 'abandoned' },
    });
  },

  async loadSession(phone: string) {
    const session = await prisma.surveySession.findFirst({
      where: { phone },
      orderBy: { updatedAt: 'desc' },
    });
    if (!session) return null;
    return {
      phone: session.phone,
      campaignId: session.campaignId,
      customerId: session.customerId,
      currentState: session.currentState as string,
      extractedData: (session.extractedData as Record<string, unknown> || {}) as SurveyResponseData,
      rawLogs: (session.rawLogs as { sender: string; state: string; text: string; at: string }[]) || [],
    };
  },

  async saveSession(phone: string, data: { phone: string; campaignId: string; customerId: string; currentState: string; extractedData: SurveyResponseData; rawLogs: { sender: string; state: string; text: string; at: string }[] }) {
    const jsonData = JSON.parse(JSON.stringify(data.extractedData));
    const jsonLogs = JSON.parse(JSON.stringify(data.rawLogs));
    const existing = await prisma.surveySession.findFirst({ where: { phone }, orderBy: { updatedAt: 'desc' } });
    if (existing) {
      return prisma.surveySession.update({
        where: { id: existing.id },
        data: { currentState: data.currentState, extractedData: jsonData, rawLogs: jsonLogs },
      });
    }
    return prisma.surveySession.create({
      data: {
        phone: data.phone, campaignId: data.campaignId, customerId: data.customerId,
        currentState: data.currentState, extractedData: jsonData, rawLogs: jsonLogs,
      },
    });
  },

  async deleteSession(phone: string) {
    return prisma.surveySession.deleteMany({ where: { phone } });
  },

  async getActiveSessionCount() {
    return prisma.surveySession.count();
  },
};
