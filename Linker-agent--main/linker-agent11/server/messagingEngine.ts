import { getBestTemplateForPhase } from './whatsappTemplates';

export const SPAM_KEYWORDS = ['خصم', 'عرض', 'مجاني', 'اربح', 'جائزة', 'سارع', 'لفترة محدودة', 'اضغط هنا', 'تخفيض', '%'];

export function hasSpamKeywords(text: string): boolean {
  return SPAM_KEYWORDS.some(k => text.includes(k));
}

export class HumanizationEngine {
  private workingHours = { start: 8, end: 22 };
  private excludeHours = [12, 13];
  private dayOff = 5; // Friday

  isWorkingTime(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    if (day === this.dayOff) return false;
    if (hour < this.workingHours.start || hour >= this.workingHours.end) return false;
    if (this.excludeHours.includes(hour)) return false;
    return true;
  }

  nextAvailableTime(): Date {
    const now = new Date();
    if (!this.isWorkingTime()) {
      const next = new Date(now);
      next.setHours(this.workingHours.start, 0, 0, 0);
      if (now.getDay() === this.dayOff || now.getHours() >= this.workingHours.end) {
        next.setDate(next.getDate() + 1);
      }
      if (next.getDay() === this.dayOff) next.setDate(next.getDate() + 1);
      return next;
    }
    return now;
  }

  randomDelay(minMs = 15000, maxMs = 90000): number {
    return Math.floor(Math.random() * (maxMs - minMs)) + minMs;
  }

  batchGap(minMs = 120000, maxMs = 300000): number {
    return Math.floor(Math.random() * (maxMs - minMs)) + minMs;
  }

  jitter(base: number, percent = 0.3): number {
    const variation = base * percent;
    return base + (Math.random() * variation * 2 - variation);
  }
}

export class CampaignScheduler {
  batchSize = 30;

  splitIntoBatches<T>(items: T[]): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += this.batchSize) {
      batches.push(items.slice(i, i + this.batchSize));
    }
    return batches;
  }

  calculateSchedule(totalRecipients: number): {
    batches: number;
    estimatedMinutes: number;
    batchSize: number;
    delayBetweenMessages: { min: number; max: number };
    delayBetweenBatches: { min: number; max: number };
  } {
    const batches = Math.ceil(totalRecipients / this.batchSize);
    const msgDelay = 30;
    const batchDelay = 180;
    const estimatedMinutes = Math.ceil(
      (totalRecipients * msgDelay + batches * batchDelay) / 60,
    );

    return {
      batches,
      estimatedMinutes,
      batchSize: this.batchSize,
      delayBetweenMessages: { min: 15, max: 90 },
      delayBetweenBatches: { min: 120, max: 300 },
    };
  }
}

export class QualityMonitor {
  private metrics = {
    totalSent24h: 0,
    totalBlocks24h: 0,
    totalReports24h: 0,
    totalReads24h: 0,
    totalReplies24h: 0,
    lastUpdated: new Date(),
  };

  recordSent() { this.metrics.totalSent24h++; }
  recordBlock() { this.metrics.totalBlocks24h++; }
  recordReport() { this.metrics.totalReports24h++; }
  recordRead() { this.metrics.totalReads24h++; }
  recordReply() { this.metrics.totalReplies24h++; }

  get blockRate(): number {
    return this.metrics.totalSent24h > 0 ? this.metrics.totalBlocks24h / this.metrics.totalSent24h : 0;
  }

  get reportRate(): number {
    return this.metrics.totalSent24h > 0 ? this.metrics.totalReports24h / this.metrics.totalSent24h : 0;
  }

  get readRate(): number {
    return this.metrics.totalSent24h > 0 ? this.metrics.totalReads24h / this.metrics.totalSent24h : 0;
  }

  get replyRate(): number {
    return this.metrics.totalSent24h > 0 ? this.metrics.totalReplies24h / this.metrics.totalSent24h : 0;
  }

  get qualityScore(): number {
    const blockPenalty = this.blockRate * 40;
    const reportPenalty = this.reportRate * 30;
    const readBonus = Math.min(this.readRate * 20, 20);
    const replyBonus = Math.min(this.replyRate * 10, 10);
    return Math.max(0, Math.min(100, 100 - blockPenalty - reportPenalty + readBonus + replyBonus));
  }

  get status(): 'green' | 'yellow' | 'orange' | 'red' {
    if (this.blockRate > 0.02 || this.reportRate > 0.005) return 'red';
    if (this.blockRate > 0.015 || this.reportRate > 0.003) return 'orange';
    if (this.blockRate > 0.01 || this.reportRate > 0.001) return 'yellow';
    return 'green';
  }

  shouldStopSending(): { stop: boolean; reason?: string } {
    if (this.blockRate > 0.02) return { stop: true, reason: `Block rate ${(this.blockRate * 100).toFixed(1)}% exceeds 2%` };
    if (this.reportRate > 0.005) return { stop: true, reason: `Report rate ${(this.reportRate * 100).toFixed(1)}% exceeds 0.5%` };
    if (this.qualityScore < 60) return { stop: true, reason: `Quality score ${this.qualityScore.toFixed(0)} below 60` };
    return { stop: false };
  }

  getSummary() {
    return {
      totalSent24h: this.metrics.totalSent24h,
      blockRate: (this.blockRate * 100).toFixed(2) + '%',
      reportRate: (this.reportRate * 100).toFixed(2) + '%',
      readRate: (this.readRate * 100).toFixed(2) + '%',
      replyRate: (this.replyRate * 100).toFixed(2) + '%',
      qualityScore: Math.round(this.qualityScore),
      status: this.status,
    };
  }
}

export const qualityMonitor = new QualityMonitor();
export const campaignScheduler = new CampaignScheduler();
export const humanizationEngine = new HumanizationEngine();

export function getMessageForPhase(phase: 'initial' | 'reminder' | 'reactivation' | 'completed'): string {
  const message = getBestTemplateForPhase(phase);
  if (hasSpamKeywords(message)) {
    console.warn(`[SpamCheck] Spam keywords found in ${phase} template, using safe fallback`);
    return getBestTemplateForPhase(phase);
  }
  return message;
}

export function canSendNow(): { ok: boolean; reason?: string } {
  if (!humanizationEngine.isWorkingTime()) {
    return { ok: false, reason: 'Outside working hours' };
  }
  const qCheck = qualityMonitor.shouldStopSending();
  if (qCheck.stop) {
    return { ok: false, reason: qCheck.reason || 'Quality threshold exceeded' };
  }
  return { ok: true };
}

export function warmUpSchedule(week: number): { maxPerDay: number; batchSize: number; delayMs: number } {
  const phases = [
    { maxPerDay: 50, batchSize: 10, delayMs: 90000 },
    { maxPerDay: 200, batchSize: 20, delayMs: 60000 },
    { maxPerDay: 500, batchSize: 30, delayMs: 30000 },
    { maxPerDay: 1000, batchSize: 50, delayMs: 15000 },
  ];
  const idx = Math.min(week - 1, phases.length - 1);
  return phases[Math.max(0, idx)];
}
