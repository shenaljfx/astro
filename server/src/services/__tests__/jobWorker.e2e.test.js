const inMemory = {
  reports: new Map(),
  users: new Map(),
  promptAnalytics: new Map(),
};

let rejectCalculationMetadataOnce = true;

const fakeDb = {
  collection(name) {
    if (name === 'reports') {
      return {
        doc(id) {
          return {
            async set(data) {
              if (rejectCalculationMetadataOnce && data && data.calculationMetadata) {
                rejectCalculationMetadataOnce = false;
                throw new Error('3 INVALID_ARGUMENT: Property calculationMetadata contains an invalid nested entity.');
              }
              inMemory.reports.set(id, data);
            },
            async get() {
              const data = inMemory.reports.get(id);
              return {
                exists: !!data,
                id,
                data: () => data,
              };
            },
            async update(updateData) {
              const current = inMemory.reports.get(id) || {};
              inMemory.reports.set(id, { ...current, ...updateData });
            },
          };
        },
      };
    }

    if (name === 'users') {
      return {
        doc(id) {
          return {
            async get() {
              const data = inMemory.users.get(id);
              return {
                exists: !!data,
                id,
                data: () => data,
              };
            },
            async update(updateData) {
              const current = inMemory.users.get(id) || {};
              inMemory.users.set(id, { ...current, ...updateData });
            },
          };
        },
      };
    }

    if (name === 'promptAnalytics') {
      return {
        doc(id) {
          return {
            async set(data) {
              inMemory.promptAnalytics.set(id, data);
            },
          };
        },
      };
    }

    throw new Error(`Unexpected collection access: ${name}`);
  },
};

jest.mock('../../config/firebase', () => ({
  getDb: jest.fn(() => fakeDb),
  COLLECTIONS: {
    REPORTS: 'reports',
    USERS: 'users',
    PROMPT_ANALYTICS: 'promptAnalytics',
    REPORT_FEEDBACK: 'reportFeedback',
    CHAT_SESSIONS: 'chatSessions',
    PORONDAM_RESULTS: 'porondamResults',
    CHARTS: 'charts',
  },
}));

jest.mock('../../engine/chat', () => ({
  generateAINarrativeReport: jest.fn(),
  createReportProgress: jest.fn(),
  updateReportProgress: jest.fn(),
}));

jest.mock('../../middleware/entitlements', () => ({
  fulfillEntitlement: jest.fn(async () => true),
  recordEntitlementError: jest.fn(async () => true),
}));

jest.mock('../costTracker', () => ({
  trackCost: jest.fn(),
}));

jest.mock('../alerting', () => ({
  notifyAlert: jest.fn(async () => true),
}));

jest.mock('../jobQueue', () => ({
  claimNextJob: jest.fn(),
  completeJob: jest.fn(),
  failJob: jest.fn(),
}));

jest.mock('../scheduler', () => ({
  sendWeeklyLagnaPushNotification: jest.fn(async () => true),
}));

const chat = require('../../engine/chat');
const { trackCost } = require('../costTracker');
const { executeAIReportJob } = require('../jobWorker');

describe('executeAIReportJob end-to-end flow', () => {
  beforeEach(() => {
    inMemory.reports.clear();
    inMemory.promptAnalytics.clear();
    inMemory.users.clear();
    inMemory.users.set('u-e2e', {
      uid: 'u-e2e',
      reportCount: 0,
    });
    rejectCalculationMetadataOnce = true;
    jest.clearAllMocks();
  });

  test('completes report generation and persists even when Firestore rejects calculationMetadata once', async () => {
    chat.generateAINarrativeReport.mockResolvedValue({
      narrativeSections: {
        lifePredictions: { text: 'Stable growth period ahead.' },
      },
      rashiChart: {
        houses: [],
        lagna: { sign: 'Scorpio' },
        planets: {},
      },
      birthData: {
        date: '1998-11-04T00:00:00.000Z',
      },
      promptVersion: 'test-v1',
      promptMetadata: { promptVersion: 'test-v1' },
      promptAnalytics: { unsupportedEventCount: 0 },
      validationMetadata: { quality: 'ok' },
      calculationMetadata: {
        engineVersion: 'Grahachara-Core-v1',
        timeContext: {
          zoneName: 'Asia/Colombo',
          offsetSeconds: 19800,
        },
      },
      tokenUsage: {
        summary: {
          costUSD: 0.25,
          costLKR: 75,
          totalInputTokens: 1000,
          totalOutputTokens: 500,
          generationTimeSec: 12,
        },
      },
      successCount: 1,
      totalSections: 1,
      failedSections: [],
    });

    const payload = {
      reportId: 'rpt_e2e_1',
      uid: 'u-e2e',
      birthDate: '1998-11-04T05:30:00+05:30',
      parsedDateISO: '1998-11-04T00:00:00.000Z',
      lat: 6.9271,
      lng: 79.8612,
      language: 'en',
      userName: 'Test User',
    };

    const result = await executeAIReportJob(payload, { id: 'job-e2e-1' });

    expect(result).toBeDefined();
    expect(result.savedReportId).toBeTruthy();
    expect(result.sectionsGenerated).toBe(1);
    expect(trackCost).toHaveBeenCalledTimes(1);

    const saved = inMemory.reports.get(result.savedReportId);
    expect(saved).toBeDefined();
    expect(saved.uid).toBe('u-e2e');
    expect(saved.sections).toEqual({
      lifePredictions: { text: 'Stable growth period ahead.' },
    });

    // The first write is forced to fail when calculationMetadata is present.
    // Save path must retry and succeed with calculationMetadata dropped.
    expect(saved.calculationMetadata).toBeNull();

    const user = inMemory.users.get('u-e2e');
    expect(user.reportCount).toBe(1);
    expect(user.lastReportAt).toBeTruthy();
  });
});
