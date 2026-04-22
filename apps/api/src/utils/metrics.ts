/**
 * Simple metrics collection system for performance monitoring
 * Tracks request counts, response times, error rates, and custom metrics
 */

export interface Metric {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: number;
}

class MetricsCollector {
  private metrics: Map<string, Metric[]> = new Map();
  private maxMetricsPerKey: number = 1000;

  record(name: string, value: number, tags?: Record<string, string>): void {
    const metric: Metric = {
      name,
      value,
      tags,
      timestamp: Date.now(),
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricsList = this.metrics.get(name)!;
    metricsList.push(metric);

    // Keep only the most recent metrics
    if (metricsList.length > this.maxMetricsPerKey) {
      metricsList.shift();
    }
  }

  increment(name: string, tags?: Record<string, string>): void {
    const metricsList = this.metrics.get(name);
    const lastValue = metricsList && metricsList.length > 0 
      ? metricsList[metricsList.length - 1].value 
      : 0;
    
    this.record(name, lastValue + 1, tags);
  }

  timing(name: string, duration: number, tags?: Record<string, string>): void {
    this.record(`${name}.duration`, duration, tags);
  }

  getCount(name: string): number {
    const metricsList = this.metrics.get(name);
    return metricsList ? metricsList.length : 0;
  }

  getAverage(name: string): number {
    const metricsList = this.metrics.get(name);
    if (!metricsList || metricsList.length === 0) return 0;

    const sum = metricsList.reduce((acc, m) => acc + m.value, 0);
    return sum / metricsList.length;
  }

  getMin(name: string): number {
    const metricsList = this.metrics.get(name);
    if (!metricsList || metricsList.length === 0) return 0;

    return Math.min(...metricsList.map(m => m.value));
  }

  getMax(name: string): number {
    const metricsList = this.metrics.get(name);
    if (!metricsList || metricsList.length === 0) return 0;

    return Math.max(...metricsList.map(m => m.value));
  }

  getPercentile(name: string, percentile: number): number {
    const metricsList = this.metrics.get(name);
    if (!metricsList || metricsList.length === 0) return 0;

    const sorted = [...metricsList].sort((a, b) => a.value - b.value);
    const index = Math.ceil(sorted.length * (percentile / 100)) - 1;
    return sorted[Math.max(0, index)].value;
  }

  getMetrics(name: string, since?: number): Metric[] {
    const metricsList = this.metrics.get(name);
    if (!metricsList) return [];

    if (since) {
      return metricsList.filter(m => m.timestamp >= since);
    }

    return metricsList;
  }

  getAllMetrics(): Record<string, Metric[]> {
    const result: Record<string, Metric[]> = {};
    this.metrics.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  clear(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }

  getSummary(): Record<string, any> {
    const summary: Record<string, any> = {};

    this.metrics.forEach((metricsList, name) => {
      if (metricsList.length === 0) return;

      const values = metricsList.map(m => m.value);
      summary[name] = {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        p50: this.getPercentile(name, 50),
        p95: this.getPercentile(name, 95),
        p99: this.getPercentile(name, 99),
      };
    });

    return summary;
  }
}

export const metrics = new MetricsCollector();

// Helper middleware to track HTTP request metrics
export function metricsMiddleware(req: any, res: any, next: any) {
  const startTime = Date.now();
  const method = req.method;
  const path = req.route?.path || req.path;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Record request count
    metrics.increment(`http.requests.total`, {
      method,
      path,
      status: statusCode.toString(),
    });

    // Record response time
    metrics.timing(`http.response_time`, duration, {
      method,
      path,
      status: statusCode.toString(),
    });

    // Record error count
    if (statusCode >= 400) {
      metrics.increment(`http.errors.total`, {
        method,
        path,
        status: statusCode.toString(),
      });
    }
  });

  next();
}
