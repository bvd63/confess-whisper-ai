import { lazy } from 'react';

/**
 * Lazy-loaded heavy components for better initial load performance
 * These components are loaded on-demand when needed
 */

// Admin & Analytics
export const AdvancedAnalytics = lazy(() => 
  import('@/components/AdvancedAnalytics')
);

export const ModerationPanel = lazy(() => 
  import('@/components/ModerationPanel')
);

export const UserAnalytics = lazy(() => 
  import('@/components/UserAnalytics')
);

// AI Insights
export const DeepInsightDialog = lazy(() => 
  import('@/components/DeepInsightDialog')
);

// Reports
export const ReportDialog = lazy(() => 
  import('@/components/ReportDialog')
);

// Performance Dashboard (for development)
export const PerformanceDashboard = lazy(() => 
  import('@/components/PerformanceDashboard')
);
