import { storage } from './storage';
import { EncryptionOperation, AuditLog } from '@shared/schema';

// Configuration for anomaly detection
const ANOMALY_CONFIG = {
  // Maximum number of operations in a time window before triggering alert
  MAX_OPERATIONS_PER_MINUTE: 20,
  
  // Threshold for failed operations ratio
  FAILED_OPERATIONS_THRESHOLD: 0.3, // 30%
  
  // Time window for operation analysis (in milliseconds)
  TIME_WINDOW_MS: 60 * 1000, // 1 minute
  
  // Threshold for operations with revoked keys
  REVOKED_KEY_OPERATIONS_THRESHOLD: 2,
  
  // Unusual time pattern detection (operations outside normal hours)
  WORKING_HOURS_START: 7, // 7 AM
  WORKING_HOURS_END: 22, // 10 PM
};

// Interface for anomaly detection results
export interface AnomalyDetectionResult {
  detected: boolean;
  anomalyType?: string;
  severity: 'low' | 'medium' | 'high';
  details?: Record<string, any>;
  timestamp: Date;
  userId: number;
}

// Cache to store recent operations for analysis
const operationsCache: Map<number, EncryptionOperation[]> = new Map();

/**
 * Analyzes recent operations for a user to detect anomalies
 * @param userId User ID to analyze
 * @returns Anomaly detection result
 */
export async function detectAnomalies(userId: number): Promise<AnomalyDetectionResult | null> {
  try {
    // Get recent operations for the user
    const recentOperations = await storage.getOperationsByUser(userId, 50);
    
    // Update cache
    operationsCache.set(userId, recentOperations);
    
    // No operations means no anomalies
    if (recentOperations.length === 0) {
      return null;
    }
    
    // Filter operations within the time window
    const now = new Date();
    const windowStart = new Date(now.getTime() - ANOMALY_CONFIG.TIME_WINDOW_MS);
    const operationsInWindow = recentOperations.filter(op => 
      op.timestamp && new Date(op.timestamp) >= windowStart
    );
    
    // Various anomaly detection checks
    const volumeAnomaly = detectVolumeAnomaly(operationsInWindow);
    if (volumeAnomaly) {
      return {
        detected: true,
        anomalyType: 'high_volume',
        severity: 'medium',
        details: volumeAnomaly,
        timestamp: now,
        userId
      };
    }
    
    const failureAnomaly = detectFailureAnomaly(userId);
    if (failureAnomaly) {
      return {
        detected: true,
        anomalyType: 'high_failure_rate',
        severity: 'high',
        details: failureAnomaly,
        timestamp: now,
        userId
      };
    }
    
    const revokedKeyAnomaly = await detectRevokedKeyUsage(userId);
    if (revokedKeyAnomaly) {
      return {
        detected: true,
        anomalyType: 'revoked_key_usage',
        severity: 'high',
        details: revokedKeyAnomaly,
        timestamp: now,
        userId
      };
    }
    
    const timeAnomaly = detectTimeAnomaly(operationsInWindow);
    if (timeAnomaly) {
      return {
        detected: true,
        anomalyType: 'unusual_time',
        severity: 'low',
        details: timeAnomaly,
        timestamp: now,
        userId
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error in anomaly detection:', error);
    return null;
  }
}

/**
 * Detect anomalously high volume of operations
 */
function detectVolumeAnomaly(operations: EncryptionOperation[]): Record<string, any> | null {
  if (operations.length > ANOMALY_CONFIG.MAX_OPERATIONS_PER_MINUTE) {
    return {
      operationCount: operations.length,
      threshold: ANOMALY_CONFIG.MAX_OPERATIONS_PER_MINUTE,
      timeWindowMinutes: ANOMALY_CONFIG.TIME_WINDOW_MS / 60000
    };
  }
  return null;
}

/**
 * Detect high failure rate in operations
 */
async function detectFailureAnomaly(userId: number): Promise<Record<string, any> | null> {
  // Get recent audit logs for failed operations
  const recentLogs = await storage.getAuditLogs(
    { 
      userId, 
      status: 'FAILED',
      action: 'DATA_ENCRYPT' // Also check DATA_DECRYPT if needed
    }, 
    20
  );
  
  if (recentLogs.length === 0) return null;
  
  // Filter logs within time window
  const now = new Date();
  const windowStart = new Date(now.getTime() - ANOMALY_CONFIG.TIME_WINDOW_MS);
  const logsInWindow = recentLogs.filter(log => 
    log.timestamp && new Date(log.timestamp) >= windowStart
  );
  
  if (logsInWindow.length === 0) return null;
  
  // Get total operations in the same window for ratio calculation
  const operations = await storage.getOperationsByUser(userId, 50);
  const operationsInWindow = operations.filter(op => 
    op.timestamp && new Date(op.timestamp) >= windowStart
  );
  
  const failureRatio = operationsInWindow.length > 0 
    ? logsInWindow.length / operationsInWindow.length 
    : 0;
  
  if (failureRatio >= ANOMALY_CONFIG.FAILED_OPERATIONS_THRESHOLD) {
    return {
      failedOperations: logsInWindow.length,
      totalOperations: operationsInWindow.length,
      failureRatio,
      threshold: ANOMALY_CONFIG.FAILED_OPERATIONS_THRESHOLD
    };
  }
  
  return null;
}

/**
 * Detect attempts to use revoked keys
 */
async function detectRevokedKeyUsage(userId: number): Promise<Record<string, any> | null> {
  // Get recent audit logs for attempts to use revoked keys
  const logs = await storage.getAuditLogs({}, 50);
  
  // Filter logs for revoked key usages
  const now = new Date();
  const windowStart = new Date(now.getTime() - ANOMALY_CONFIG.TIME_WINDOW_MS);
  
  const revokedKeyLogs = logs.filter(log => {
    if (!log.timestamp || new Date(log.timestamp) < windowStart) return false;
    if (log.userId !== userId) return false;
    
    // Check if the log details mention revoked key
    if (log.details) {
      const details = typeof log.details === 'string' 
        ? JSON.parse(log.details) 
        : log.details;
      
      return details.error && details.error.includes('not active');
    }
    return false;
  });
  
  if (revokedKeyLogs.length >= ANOMALY_CONFIG.REVOKED_KEY_OPERATIONS_THRESHOLD) {
    return {
      revokedKeyAttempts: revokedKeyLogs.length,
      threshold: ANOMALY_CONFIG.REVOKED_KEY_OPERATIONS_THRESHOLD,
      recentAttempts: revokedKeyLogs.map(log => ({
        timestamp: log.timestamp,
        details: log.details
      }))
    };
  }
  
  return null;
}

/**
 * Detect operations at unusual times
 */
function detectTimeAnomaly(operations: EncryptionOperation[]): Record<string, any> | null {
  const outsideWorkingHours = operations.filter(op => {
    if (!op.timestamp) return false;
    const opTime = new Date(op.timestamp);
    const hour = opTime.getHours();
    return hour < ANOMALY_CONFIG.WORKING_HOURS_START || hour >= ANOMALY_CONFIG.WORKING_HOURS_END;
  });
  
  if (outsideWorkingHours.length > 0) {
    return {
      operationsOutsideHours: outsideWorkingHours.length,
      workingHoursStart: ANOMALY_CONFIG.WORKING_HOURS_START,
      workingHoursEnd: ANOMALY_CONFIG.WORKING_HOURS_END,
      details: outsideWorkingHours.map(op => ({
        timestamp: op.timestamp,
        operation: op.operation,
        algorithm: op.algorithm
      }))
    };
  }
  
  return null;
}

/**
 * Record an anomaly for auditing and alerting
 */
export async function recordAnomaly(anomaly: AnomalyDetectionResult): Promise<void> {
  try {
    // Record in audit logs
    await storage.recordAuditLog({
      userId: anomaly.userId,
      action: 'ANOMALY_DETECTED',
      resource: anomaly.anomalyType || 'unknown',
      status: 'WARNING',
      ipAddress: null,
      userAgent: null,
      details: {
        anomalyType: anomaly.anomalyType,
        severity: anomaly.severity,
        details: anomaly.details
      }
    });
    
    // In a real system, you might implement additional alerting mechanisms:
    // - Send email/SMS to security administrators
    // - Trigger account lockout for high-severity anomalies
    // - Push notifications to monitoring dashboards
    
    console.log(`[SECURITY ALERT] Anomaly detected for user ${anomaly.userId}: ${anomaly.anomalyType} (${anomaly.severity})`);
  } catch (error) {
    console.error('Error recording anomaly:', error);
  }
}

/**
 * Reset detection thresholds for a user (after investigation)
 */
export function resetAnomalyDetection(userId: number): void {
  operationsCache.delete(userId);
}