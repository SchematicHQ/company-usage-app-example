// src/components/CompanyUsageApp.tsx
'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

const DEFAULT_LOGO = '/company-placeholder.png'; // Add a placeholder image in your public folder
interface Company {
  company: {
    id: string;
    name: string;
    logo_url: string;
    plan?: {
      name: string;
    };
  };
  period: string;
  usage: number;
  allocation: number | null;
}

interface PaginationState {
  offset: number;
  limit: number;
  total?: number;
  hasMore: boolean;
}

interface ApiResponse {
  data: Company[];
  pagination: PaginationState;
}

interface UsageAlert {
  companyId: string;
  companyName: string;
  threshold: number;
  usage: number;
  allocation: number | null;
  timestamp: string;
}

interface WebhookLog {
  id: string;
  companyName: string;
  threshold: number;
  feature: string;
  timestamp: Date;
  status: 'success' | 'error';
  error?: string;
}

const POLLING_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
const THRESHOLDS = [100, 90, 80];

const formatNumber = (num: number | null): string => {
  if (num === null || num === undefined) return '∞';
  return num.toLocaleString();
};

const calculateUsagePercentage = (usage: number, allocation: number | null): number => {
  if (allocation === null || usage === 0) return 0;
  return (usage / allocation) * 100;
};

const CompanyUsageList = ({ 
  data, 
  previousUsage,
  setAlertSent,
  addWebhookLog
}: { 
  data: ApiResponse | null;
  previousUsage: Map<string, number>;
  setAlertSent: React.Dispatch<React.SetStateAction<Set<string>>>;
  addWebhookLog: (log: WebhookLog) => void;
}) => {
  const companies = data?.data || [];

  // Sort companies by utilization percentage
  const sortedCompanies = [...companies].sort((a, b) => {
    const percentageA = calculateUsagePercentage(a.usage, a.allocation);
    const percentageB = calculateUsagePercentage(b.usage, b.allocation);
    return percentageB - percentageA;
  });

  return (
    <div className="space-y-4">
      {sortedCompanies.map((company) => {
        const usagePercentage = calculateUsagePercentage(company.usage, company.allocation);
        
        return (
          <div 
            key={company.company.id} 
            className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="relative w-8 h-8">
                  <Image 
                    src={company.company.logoUrl || DEFAULT_LOGO}
                    alt={`${company.company.name} logo`}
                    fill
                    className="rounded-full object-cover"
                    sizes="32px"
                    onError={(e) => {
                      // TypeScript requires this type assertion
                      const img = e.target as HTMLImageElement;
                      img.src = DEFAULT_LOGO;
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-medium">{company.company.name}</h3>
                  <p className="text-sm text-gray-500">
                    {company.company.plan?.name || 'No Plan'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {usagePercentage.toFixed(1)}% utilized
                </span>
                {company.period === 'current_day' && (
                  <div className="flex items-center text-amber-600">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    <span className="text-sm">Daily Limit</span>
                  </div>
                )}
               {company.period === 'current_month' && (
                  <div className="flex items-center text-amber-600">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    <span className="text-sm">Monthly Limit</span>
                  </div>
                )}
               {company.period === 'current_year' && (
                  <div className="flex items-center text-amber-600">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    <span className="text-sm">Yearly Limit</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-2">
              <div className="flex justify-between text-sm mb-1">
                <span>Usage: {formatNumber(company.usage)}</span>
                <span>Allocation: {formatNumber(company.allocation)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    usagePercentage > 90 ? 'bg-red-500' : 
                    usagePercentage > 75 ? 'bg-amber-500' : 
                    'bg-blue-600'
                  }`}
                  style={{ 
                    width: `${Math.min(usagePercentage, 100)}%`
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
            {data?.pagination.hasMore && (
        <Button 
          onClick={loadMore} 
          disabled={loading}
          className="mt-4 w-full"  // made it full width for better appearance
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          Load More
        </Button>
      )}
    </div>
  );
};

const CompanyUsageApp = () => {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [featureId, setFeatureId] = useState('feat_8PMt5Yzd6Na');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [alertSent, setAlertSent] = useState<Set<string>>(new Set());
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const previousUsage = useRef(new Map<string, number>()).current;
  const pollInterval = useRef<NodeJS.Timeout>();

  const addWebhookLog = useCallback((log: WebhookLog) => {
    setWebhookLogs(prev => [log, ...prev].slice(0, 50));
  }, []);

  const fetchData = async (
    featureId: string,
    offset: number = 0,
    limit: number = 100
  ) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/feature-usage?featureId=${featureId}&offset=${offset}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const jsonData = await response.json();
      setData(prev => {
        if (offset === 0) {
          return jsonData;
        }
        // Append data for pagination
        return {
          data: [...(prev?.data || []), ...jsonData.data],
          pagination: jsonData.pagination
        };
      });
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const [pagination, setPagination] = useState<PaginationState>({
    offset: 0,
    limit: 100,
    hasMore: true
  });
  
  const loadMore = () => {
    if (pagination.hasMore && !loading) {
      fetchData(
        featureId,
        pagination.offset + pagination.limit,
        pagination.limit
      );
    }
  };

  const setupPolling = useCallback(() => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
    }

    pollInterval.current = setInterval(() => {
      fetchData(featureId);
    }, POLLING_INTERVAL);

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [featureId]);

  useEffect(() => {
    const checkUsageAndNotifications = async () => {
      await fetchData(featureId);
      // Call our new notifications endpoint
      try {
        const response = await fetch('/api/usage-notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ featureId })
        });
        
        if (response.ok) {
          const { notifications } = await response.json();
          // Only add to webhook logs if there were new notifications
          if (notifications?.length > 0) {
            notifications.forEach(notification => {
              addWebhookLog({
                id: `${notification.companyId}-${notification.threshold}-${Date.now()}`,
                companyName: notification.companyName,
                threshold: notification.threshold,
                timestamp: new Date(notification.timestamp),
                status: 'success'
              });
            });
          }
        }
      } catch (error) {
        console.error('Failed to check notifications:', error);
        addWebhookLog({
          id: `error-${Date.now()}`,
          companyName: 'System',
          threshold: 0,
          timestamp: new Date(),
          status: 'error',
          error: error instanceof Error ? error.message : 'Failed to check notifications'
        });
      }
    };

    // Initial check
    checkUsageAndNotifications();

    // Set up polling interval
    const interval = setInterval(checkUsageAndNotifications, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [featureId]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(featureId);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Feature Usage Monitor</h1>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              type="text"
              value={featureId}
              onChange={(e) => setFeatureId(e.target.value)}
              placeholder="Enter feature ID"
              className="w-64"
            />
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load'}
            </Button>
          </form>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList>
            <TabsTrigger value="dashboard">Usage Dashboard</TabsTrigger>
            <TabsTrigger value="logs" className="relative">
              Webhook Logs
              {webhookLogs.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {webhookLogs.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Card>
              <CardHeader>
                <CardTitle>Company Usage Dashboard</CardTitle>
                {lastUpdated && (
                  <p className="text-sm text-gray-500">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {loading && data === null ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Error loading data: {error}
                    </AlertDescription>
                  </Alert>
                ) : data?.data.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No data found for this feature ID
                    </AlertDescription>
                  </Alert>
                ) : (
                  <CompanyUsageList 
                    data={data} 
                    previousUsage={previousUsage}
                    setAlertSent={setAlertSent}
                    addWebhookLog={addWebhookLog}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Webhook Activity Log</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setWebhookLogs([])}
                    disabled={webhookLogs.length === 0}
                  >
                    Clear Logs
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {webhookLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No webhook activity yet</p>
                      <p className="text-sm mt-1">
                        Logs will appear here when usage thresholds are crossed
                      </p>
                    </div>
                  ) : (
                    webhookLogs.map((log) => (
                      <div
                        key={log.id}
                        className={`p-3 rounded-md text-sm ${
                          log.status === 'success' 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-red-50 border border-red-200'
                        }`}
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">
                            {log.companyName} - {log.threshold}% threshold
                          </span>
                          <span className="text-gray-500">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        {log.error && (
                          <p className="text-red-600 mt-1">Error: {log.error}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CompanyUsageApp;
