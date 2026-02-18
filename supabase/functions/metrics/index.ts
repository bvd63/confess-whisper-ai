import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
    };

    interface Metric {
      name: string;
        value: number;
          type: 'counter' | 'gauge' | 'histogram';
            labels?: Record<string, string>;
              timestamp: number;
              }

              const metrics: Metric[] = [];
              const MAX_METRICS = 10000;

              // Structured logging helper
              function log(level: 'info' | 'warn' | 'error', message: string, metadata?: any) {
                console.log(JSON.stringify({
                    timestamp: new Date().toISOString(),
                        level,
                            message,
                                function: 'metrics',
                                    metadata,
                                      }));
                                      }

                                      serve(async (req) => {
                                        if (req.method === 'OPTIONS') {
                                            return new Response(null, { headers: corsHeaders });
                                              }

                                                const url = new URL(req.url);

                                                  try {
                                                      const internalSecret = req.headers.get('x-internal-secret');
                                                          const expectedSecret = Deno.env.get('INTERNAL_JOB_SECRET');

                                                              if (!internalSecret || !expectedSecret || internalSecret !== expectedSecret) {
                                                                    return new Response(
                                                                            JSON.stringify({ error: 'Unauthorized' }),
                                                                                    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                                                                                          );
                                                                                              }

                                                                                                  const supabaseClient = createClient(
                                                                                                        Deno.env.get('SUPABASE_URL') ?? '',
                                                                                                              Deno.env.get('SUPABASE_ANON_KEY') ?? ''
                                                                                                                  );

                                                                                                                      // POST - Record metrics
                                                                                                                          if (req.method === 'POST') {
                                                                                                                                log('info', 'Metrics POST request received');
                                                                                                                                      
                                                                                                                                            const authHeader = req.headers.get('Authorization');
                                                                                                                                                  if (!authHeader) {
                                                                                                                                                          log('warn', 'Unauthorized metrics POST attempt');
                                                                                                                                                                  return new Response(
                                                                                                                                                                            JSON.stringify({ error: 'Unauthorized' }),
                                                                                                                                                                                      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                                                                                                                                                                                              );
                                                                                                                                                                                                    }

                                                                                                                                                                                                          const token = authHeader.replace('Bearer ', '');
                                                                                                                                                                                                                const { data: { user } } = await supabaseClient.auth.getUser(token);

                                                                                                                                                                                                                      if (!user) {
                                                                                                                                                                                                                              return new Response(
                                                                                                                                                                                                                                        JSON.stringify({ error: 'Unauthorized' }),
                                                                                                                                                                                                                                                  { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                                                                                                                                                                                                                                                          );
                                                                                                                                                                                                                                                                }

                                                                                                                                                                                                                                                                      const body = await req.json();
                                                                                                                                                                                                                                                                            const { name, value, type = 'counter', labels = {} } = body;

                                                                                                                                                                                                                                                                                  if (!name || value === undefined) {
                                                                                                                                                                                                                                                                                          return new Response(
                                                                                                                                                                                                                                                                                                    JSON.stringify({ error: 'name and value are required' }),
                                                                                                                                                                                                                                                                                                              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                                                                                                                                                                                                                                                                                                                      );
                                                                                                                                                                                                                                                                                                                            }

                                                                                                                                                                                                                                                                                                                                  const metric: Metric = {
                                                                                                                                                                                                                                                                                                                                          name,
                                                                                                                                                                                                                                                                                                                                                  value,
                                                                                                                                                                                                                                                                                                                                                          type,
                                                                                                                                                                                                                                                                                                                                                                  labels: { ...labels },
                                                                                                                                                                                                                                                                                                                                                                          timestamp: Date.now(),
                                                                                                                                                                                                                                                                                                                                                                                };
                                                                                                                                                                                                                                                                                                                                                                                
      metrics.push(metric);

      // Keep only last MAX_METRICS
      if (metrics.length > MAX_METRICS) {
        metrics.splice(0, metrics.length - MAX_METRICS);
      }

      log('info', 'Metric recorded', { 
        name: metric.name, 
        type: metric.type,
        totalMetrics: metrics.length 
      });

      return new Response(
        JSON.stringify({ success: true, metric }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET - Retrieve metrics (Prometheus format or JSON)
    if (req.method === 'GET') {
      log('info', 'Metrics GET request received', { 
        format: url.searchParams.get('format'),
        name: url.searchParams.get('name')
      });
      const format = url.searchParams.get('format') || 'json';
      const name = url.searchParams.get('name');
      const startTime = url.searchParams.get('start');
      const endTime = url.searchParams.get('end');

      let filteredMetrics = [...metrics];

      // Filter by name
      if (name) {
        filteredMetrics = filteredMetrics.filter(m => m.name === name);
      }

      // Filter by time range
      if (startTime) {
        const start = parseInt(startTime);
        filteredMetrics = filteredMetrics.filter(m => m.timestamp >= start);
      }
      if (endTime) {
        const end = parseInt(endTime);
        filteredMetrics = filteredMetrics.filter(m => m.timestamp <= end);
      }

      if (format === 'prometheus') {
        // Return Prometheus exposition format
        const promFormat = generatePrometheusFormat(filteredMetrics);
        return new Response(promFormat, {
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        });
      }

      // Return JSON with aggregations
      const aggregated = aggregateMetrics(filteredMetrics);

      log('info', 'Metrics retrieved', { 
        count: filteredMetrics.length,
        uniqueMetrics: Object.keys(aggregated).length 
      });

      return new Response(
        JSON.stringify({
          total: filteredMetrics.length,
          timeRange: {
            start: filteredMetrics[0]?.timestamp || null,
            end: filteredMetrics[filteredMetrics.length - 1]?.timestamp || null,
          },
          metrics: aggregated,
        }, null, 2),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    log('error', 'Metrics operation failed', { error: errorMsg });
    
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function aggregateMetrics(metrics: Metric[]) {
  const byName: Record<string, {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  }> = {};

  const grouped = metrics.reduce((acc, metric) => {
    if (!acc[metric.name]) {
      acc[metric.name] = [];
    }
    acc[metric.name].push(metric.value);
    return acc;
  }, {} as Record<string, number[]>);

  Object.entries(grouped).forEach(([name, values]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    byName[name] = {
      count: values.length,
      sum,
      avg: sum / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  });

  return byName;
}

function generatePrometheusFormat(metrics: Metric[]): string {
  const lines: string[] = [];
  const byName: Record<string, Metric[]> = {};

  // Group by metric name
  metrics.forEach(metric => {
    if (!byName[metric.name]) {
      byName[metric.name] = [];
    }
    byName[metric.name].push(metric);
  });

  // Generate Prometheus format
  Object.entries(byName).forEach(([name, metricList]) => {
    const type = metricList[0].type;
    lines.push(`# TYPE ${name} ${type}`);
    
    metricList.forEach(metric => {
      const labels = metric.labels
        ? Object.entries(metric.labels)
            .map(([k, v]) => `${k}=\"${v}\"`)
            .join(',')
        : '';
      
      const labelsStr = labels ? `{${labels}}` : '';
      lines.push(`${name}${labelsStr} ${metric.value} ${metric.timestamp}`);
    });
    
    lines.push('');
  });

  return lines.join('\n');
}
