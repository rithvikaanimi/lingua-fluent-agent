import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BarChart3, Search, Download, Clock, Users, Globe, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SessionStats {
  totalSessions: number;
  averageAccuracy: number;
  totalTranslations: number;
  mostUsedLanguages: { language: string; count: number }[];
  recentSessions: any[];
}

export const AnalyticsDashboard = () => {
  const [stats, setStats] = useState<SessionStats>({
    totalSessions: 0,
    averageAccuracy: 0,
    totalTranslations: 0,
    mostUsedLanguages: [],
    recentSessions: [],
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);

      // Get session statistics
      const { data: sessions, error: sessionsError } = await supabase
        .from('conversation_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Get message statistics
      const { data: messages, error: messagesError } = await supabase
        .from('translation_messages')
        .select('*');

      if (messagesError) throw messagesError;

      // Calculate statistics
      const totalSessions = sessions?.length || 0;
      const totalTranslations = messages?.length || 0;
      
      const averageAccuracy = sessions?.length 
        ? Math.round(sessions.reduce((sum, session) => sum + (session.average_accuracy || 0), 0) / sessions.length)
        : 0;

      // Calculate most used languages
      const languageCount: { [key: string]: number } = {};
      messages?.forEach(message => {
        languageCount[message.original_language] = (languageCount[message.original_language] || 0) + 1;
        languageCount[message.target_language] = (languageCount[message.target_language] || 0) + 1;
      });

      const mostUsedLanguages = Object.entries(languageCount)
        .map(([language, count]) => ({ language, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalSessions,
        averageAccuracy,
        totalTranslations,
        mostUsedLanguages,
        recentSessions: sessions?.slice(0, 10) || [],
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const { data, error } = await supabase
        .from('conversation_sessions')
        .select(`
          *,
          translation_messages (*)
        `);

      if (error) throw error;

      const csvContent = `data:text/csv;charset=utf-8,${encodeURIComponent(
        'Session ID,Title,Date,Duration,Accuracy,Messages Count\n' +
        data.map(session => 
          `${session.id},${session.title},${session.created_at},${session.session_duration},${session.average_accuracy},${session.translation_messages?.length || 0}`
        ).join('\n')
      )}`;

      const link = document.createElement('a');
      link.href = csvContent;
      link.download = `translation_analytics_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const getLanguageName = (code: string) => {
    const languages: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
    };
    return languages[code] || code;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="glass-card">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Analytics Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">
            Professional translation performance insights
          </p>
        </div>
        <Button onClick={exportData} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-3xl font-bold text-primary">{stats.totalSessions}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Accuracy</p>
                <p className="text-3xl font-bold text-accent">{stats.averageAccuracy}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Translations</p>
                <p className="text-3xl font-bold text-blue-500">{stats.totalTranslations}</p>
              </div>
              <Globe className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-3xl font-bold text-purple-500">1</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Language Usage */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Most Used Languages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.mostUsedLanguages.map((lang, index) => (
                <div key={lang.language} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">{index + 1}</Badge>
                    <span className="font-medium">{getLanguageName(lang.language)}</span>
                  </div>
                  <Badge variant="secondary">{lang.count} uses</Badge>
                </div>
              ))}
              {stats.mostUsedLanguages.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No language data available yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Sessions</CardTitle>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search sessions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stats.recentSessions
                .filter(session => 
                  !searchQuery || 
                  session.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  session.source_language?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  session.target_language?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm">{session.title || 'Untitled Session'}</span>
                      <Badge variant="outline" className="text-xs">
                        {getLanguageName(session.source_language)} → {getLanguageName(session.target_language)}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDate(session.created_at)}
                      </span>
                      {session.session_duration > 0 && (
                        <span>{formatDuration(session.session_duration)}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={session.average_accuracy >= 90 ? 'default' : session.average_accuracy >= 80 ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {session.average_accuracy || 0}%
                    </Badge>
                  </div>
                </div>
              ))}
              {stats.recentSessions.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No sessions found
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};