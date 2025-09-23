import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, Volume2, Bot } from 'lucide-react';

interface Message {
  id: string;
  speaker: 'A' | 'B';
  original: string;
  translated: string;
  confidence: number;
  timestamp: Date;
  sourceLanguage: string;
  targetLanguage: string;
}

interface ConversationViewProps {
  messages: Message[];
  currentSpeaker: 'A' | 'B';
  isRecording: boolean;
  isTranslating: boolean;
  getLanguageFlag: (code: string) => string;
  getLanguageName: (code: string) => string;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  messages,
  currentSpeaker,
  isRecording,
  isTranslating,
  getLanguageFlag,
  getLanguageName,
}) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'accuracy-high';
    if (confidence >= 80) return 'accuracy-medium';
    return 'accuracy-low';
  };

  return (
    <Card className="glass-card h-[600px] flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Live Conversation</CardTitle>
          <div className="flex items-center space-x-2">
            {isRecording && (
              <Badge variant="destructive" className="animate-pulse">
                <Mic className="h-3 w-3 mr-1" />
                Recording
              </Badge>
            )}
            {isTranslating && (
              <Badge variant="secondary">
                <Bot className="h-3 w-3 mr-1" />
                AI Translating...
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto">
        <div className="space-y-4">
          {messages.length === 0 && !isRecording && (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <div className="text-center text-muted-foreground">
                <Volume2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Welcome to LinguaFluent Agent</p>
                <p className="text-sm">Press the microphone button to start your first professional translation session.</p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className="space-y-2 animate-fade-in-up">
              {/* Speaker Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={message.speaker === 'A' ? 'default' : 'secondary'}
                    className={message.speaker === 'A' ? 'conversation-bubble-a' : 'conversation-bubble-b'}
                  >
                    Speaker {message.speaker}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
                <Badge variant="outline" className={`text-xs ${getConfidenceColor(message.confidence)}`}>
                  {message.confidence}% accuracy
                </Badge>
              </div>

              {/* Original Text */}
              <Card className={`border-l-4 ${message.speaker === 'A' ? 'border-l-blue-500' : 'border-l-purple-500'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      {getLanguageFlag(message.sourceLanguage)} {getLanguageName(message.sourceLanguage)} Original
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{message.original}</p>
                </CardContent>
              </Card>

              {/* Translated Text */}
              <Card className={`border-l-4 ${message.speaker === 'A' ? 'border-l-blue-300' : 'border-l-purple-300'} ml-4`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {getLanguageFlag(message.targetLanguage)} {getLanguageName(message.targetLanguage)} Translation
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{message.translated}</p>
                </CardContent>
              </Card>
            </div>
          ))}

          {/* Real-time Recording Indicator */}
          {isRecording && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-6 bg-primary rounded voice-wave"></div>
                <div className="w-2 h-8 bg-primary rounded voice-wave" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-4 bg-primary rounded voice-wave" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-7 bg-primary rounded voice-wave" style={{ animationDelay: '0.3s' }}></div>
                <div className="w-2 h-5 bg-primary rounded voice-wave" style={{ animationDelay: '0.4s' }}></div>
                <span className="text-sm text-muted-foreground ml-3">
                  Listening to Speaker {currentSpeaker}...
                </span>
              </div>
            </div>
          )}

          {/* AI Processing Indicator */}
          {isTranslating && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center space-x-3">
                <Bot className="h-5 w-5 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">
                  AI Agent processing translation...
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};