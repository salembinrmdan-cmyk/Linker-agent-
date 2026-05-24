import assert from 'node:assert/strict';
import test from 'node:test';
import { captureAnswer, createConversationEngine, resetSurveyConfig, updateSurveyConfig, type SessionData } from './conversationEngine';
import type { CompleteSurveyArgs, SurveyResponseData } from './marketIntelligenceStore';

test('conversation engine captures and completes a broker survey', async () => {
  const completedSurveys: CompleteSurveyArgs[] = [];
  let savedSession: SessionData | null = null;
  const engine = createConversationEngine({
    async prepareSurveySession() {
      return { customerId: 'customer-1' };
    },
    async completeSurvey(args) {
      completedSurveys.push(args);
      return { id: 'response-1' };
    },
    async rejectSurvey() {
      return { id: 'rejected-1' };
    },
    async loadSession() { return savedSession; },
    async saveSession(_phone, data) { savedSession = structuredClone(data); },
    async deleteSession() { savedSession = null; },
    async getActiveSessionCount() { return savedSession ? 1 : 0; },
  });

  const greeting = await engine.startConversation('777123456', 'campaign-1');
  assert.match(greeting, /السلام عليكم/);

  await engine.handleIncomingMessage('777123456', 'نعم');
  await engine.handleIncomingMessage('777123456', 'شي إن، نون');
  await engine.handleIncomingMessage('777123456', 'شي إن');
  await engine.handleIncomingMessage('777123456', '2');
  await engine.handleIncomingMessage('777123456', 'إنستغرام');
  await engine.handleIncomingMessage('777123456', 'وسيط صنعاء السريع');
  await engine.handleIncomingMessage('777123456', 'واتساب');
  await engine.handleIncomingMessage('777123456', 'يوفر الدفع عند الاستلام');
  await engine.handleIncomingMessage('777123456', '20 يوم');
  await engine.handleIncomingMessage('777123456', 'نعم');
  await engine.handleIncomingMessage('777123456', 'نعم');
  await engine.handleIncomingMessage('777123456', 'تأخير التوصيل');
  await engine.handleIncomingMessage('777123456', '$80');
  await engine.handleIncomingMessage('777123456', 'شهرياً');
  await engine.handleIncomingMessage('777123456', 'صنعاء');
  await engine.handleIncomingMessage('777123456', '18 - 24');
  await engine.handleIncomingMessage('777123456', 'أنثى');
  await engine.handleIncomingMessage('777123456', 'الدفع عند الاستلام');
  await engine.handleIncomingMessage('777123456', 'لا');
  await engine.handleIncomingMessage('777123456', 'الرسوم المخفية');
  await engine.handleIncomingMessage('777123456', 'أكيد');
  const closing = await engine.handleIncomingMessage('777123456', 'التوصيل المباشر والكاش');

  assert.match(closing ?? '', /شكراً لك/);
  assert.equal(completedSurveys.length, 1);
  assert.equal(completedSurveys[0]?.customerId, 'customer-1');
  assert.equal(completedSurveys[0]?.data.platforms, 'شي إن، نون');
  assert.equal(completedSurveys[0]?.data.preferredPlatform, 'شي إن');
  assert.equal(completedSurveys[0]?.data.purchaseMethod, 'broker');
  assert.equal(completedSurveys[0]?.data.brokerSource, 'إنستغرام');
  assert.equal(completedSurveys[0]?.data.brokerName, 'وسيط صنعاء السريع');
  assert.equal(completedSurveys[0]?.data.brokerPlatform, 'واتساب');
  assert.equal(completedSurveys[0]?.data.brokerReason, 'يوفر الدفع عند الاستلام');
  assert.equal(completedSurveys[0]?.data.deliveryTime, '20 يوم');
  assert.equal(completedSurveys[0]?.data.cashOnDelivery, 'نعم');
  assert.equal(completedSurveys[0]?.data.hasProblems, true);
  assert.equal(completedSurveys[0]?.data.mainProblem, 'تأخير التوصيل');
  assert.equal(completedSurveys[0]?.data.city, 'صنعاء');
  assert.equal(completedSurveys[0]?.data.directPurchaseProb, 'أكيد');
  assert.equal(await engine.getActiveConversationCount(), 0);
});

test('purchase method aliases normalize to broker while preserving raw text', () => {
  for (const value of ['وسيط', 'وسيطة', 'مندوب', 'مندوبة', 'شخص يطلب لي', 'حساب يطلب', 'متجر إنستغرام', 'صفحة طلبات']) {
    const data: SurveyResponseData = {};
    captureAnswer('ASK_PURCHASE_METHOD', value, data);
    assert.equal(data.purchaseMethod, 'broker');
    assert.equal(data.purchaseMethodRaw, value);
  }
});

test('conversation engine returns null when no conversation is active', async () => {
  const engine = createConversationEngine({
    async prepareSurveySession() {
      return { customerId: 'unused' };
    },
    async completeSurvey() {
      return { id: 'unused' };
    },
    async rejectSurvey() {
      return { id: 'unused' };
    },
    async loadSession() { return null; },
    async saveSession() {},
    async deleteSession() {},
    async getActiveSessionCount() { return 0; },
  });

  assert.equal(await engine.handleIncomingMessage('777000000', 'مرحبا'), null);
});

test('multi-select numeric answers are normalized to selected labels', () => {
  const data: SurveyResponseData = {};
  captureAnswer('ASK_DIRECT_ENCOURAGEMENT', '1، 2, 3', data);
  assert.equal(data.directEncouragement, 'الدفع عند الاستلام، سرعة التوصيل، تتبع واضح');
});

test('saved question config changes rendered question type and options', () => {
  try {
    updateSurveyConfig({
      questions: [{
        id: 'ASK_DIRECT_ENCOURAGEMENT',
        label: 'محفزات الطلب',
        text: 'اختر محفزاتك',
        key: 'directEncouragement',
        type: 'multi_select',
        options: ['الدفع عند الاستلام', 'سرعة التوصيل'],
      }],
    });

    const data: SurveyResponseData = {};
    captureAnswer('ASK_DIRECT_ENCOURAGEMENT', '1, 2', data);
    assert.equal(data.directEncouragement, 'الدفع عند الاستلام، سرعة التوصيل');
  } finally {
    resetSurveyConfig();
  }
});
