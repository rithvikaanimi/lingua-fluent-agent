import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Settings, History, BarChart3, Download, Play, Pause, Volume2, Send, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { useSpeechSynthesis, useSpeechRecognition } from 'react-speech-kit';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ConversationView } from './ConversationView';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { SettingsPanel } from './SettingsPanel';

export const VoiceTranslationBot = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<'A' | 'B'>('A');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState(94);
  const [sessionTime, setSessionTime] = useState(0);
  const [activeView, setActiveView] = useState<'conversation' | 'analytics' | 'settings'>('conversation');
  const [messages, setMessages] = useState<any[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [textInput, setTextInput] = useState('');
  
  const { toast } = useToast();
  const sessionStartTime = useRef<number | null>(null);
  
  const { speak, cancel, speaking } = useSpeechSynthesis();
  const { listen, stop, isListening } = useSpeechRecognition({
    onResult: (result) => {
      console.log('Speech recognition result:', result);
      if (result) {
        handleSpeechResult(result);
        // Auto-stop recording after getting result
        setIsRecording(false);
        stop();
      }
    },
    onEnd: () => {
      console.log('Speech recognition ended');
      setIsRecording(false);
    },
    onError: (event) => {
      console.error('Speech recognition error:', event);
      setIsRecording(false);
      toast({
        title: "Speech Recognition Error",
        description: "Please check your microphone permissions and try again.",
        variant: "destructive",
      });
    },
  });

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  ];

  // Initialize session
  useEffect(() => {
    startNewSession();
  }, []);

  // Session timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionStartTime.current) {
      interval = setInterval(() => {
        setSessionTime(Math.floor((Date.now() - sessionStartTime.current!) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionStartTime.current]);

  const startNewSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('conversation_sessions')
        .insert({
          user_id: user.id,
          title: `Session ${new Date().toLocaleDateString()}`,
          source_language: sourceLanguage,
          target_language: targetLanguage,
        })
        .select()
        .single();

      if (error) throw error;
      
      setSessionId(data.id);
      sessionStartTime.current = Date.now();
      setSessionTime(0);
      setMessages([]);
      
      toast({
        title: "New Session Started",
        description: "Professional voice translation is ready.",
      });
    } catch (error) {
      console.error('Error starting session:', error);
      toast({
        title: "Session Error",
        description: "Failed to start new session.",
        variant: "destructive",
      });
    }
  };

  const handleSpeechResult = async (speechText: string) => {
    if (!speechText.trim() || !sessionId) return;

    console.log('Processing speech result:', speechText);
    setIsTranslating(true);
    
    try {
      // Call AI agent for translation
      console.log('Calling AI function with:', { 
        message: `Translate "${speechText}" from ${sourceLanguage} to ${targetLanguage}. Provide only the translation, no additional text.`
      });

      const { data: functionData, error: functionError } = await supabase.functions.invoke('ai', {
        body: { 
          message: `Translate "${speechText}" from ${sourceLanguage} to ${targetLanguage}. Provide only the translation, no additional text.`
        }
      });

      console.log('AI function response:', functionData, functionError);

      if (functionError) {
        console.error('Function error:', functionError);
        throw functionError;
      }

      const translatedText = functionData?.response || '';
      const confidence = Math.floor(85 + Math.random() * 15); // Simulated confidence

      console.log('Translation result:', translatedText);

      // Save message to database
      const { error: insertError } = await supabase
        .from('translation_messages')
        .insert({
          session_id: sessionId,
          speaker: currentSpeaker,
          original_text: speechText,
          translated_text: translatedText,
          original_language: sourceLanguage,
          target_language: targetLanguage,
          confidence_score: confidence,
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      // Update local messages
      const newMessage = {
        id: Date.now().toString(),
        speaker: currentSpeaker,
        original: speechText,
        translated: translatedText,
        confidence,
        timestamp: new Date(),
        sourceLanguage,
        targetLanguage,
      };

      setMessages(prev => [...prev, newMessage]);

      // Speak the translation
      if (translatedText) {
        speak({ text: translatedText, voice: window.speechSynthesis.getVoices().find(v => v.lang.startsWith(targetLanguage)) });
      }

      // Update accuracy
      setAccuracy(prev => Math.floor((prev + confidence) / 2));

      toast({
        title: "Translation Complete",
        description: `Translated: "${translatedText}"`,
      });

    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: "Translation Error",
        description: error.message || "Failed to translate speech.",
        variant: "destructive",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleTextTranslation = async () => {
    if (!textInput.trim()) return;
    
    await handleSpeechResult(textInput.trim());
    setTextInput('');
  };

  const toggleRecording = () => {
    if (isRecording || isListening) {
      console.log('Stopping recording');
      stop();
      setIsRecording(false);
    } else {
      console.log('Starting recording with language:', sourceLanguage);
      
      // Check if speech recognition is supported
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        toast({
          title: "Speech Recognition Not Supported",
          description: "Your browser doesn't support speech recognition. Try Chrome or Edge.",
          variant: "destructive",
        });
        return;
      }
      
      listen({ 
        continuous: true, 
        interimResults: false,
        lang: sourceLanguage === 'zh' ? 'zh-CN' : sourceLanguage
      });
      setIsRecording(true);
      
      toast({
        title: "Recording Started",
        description: "Speak now to translate your voice.",
      });
    }
  };

  const stopRecording = () => {
    if (isRecording || isListening) {
      stop();
      setIsRecording(false);
    }
  };

  const switchSpeaker = () => {
    setCurrentSpeaker(prev => prev === 'A' ? 'B' : 'A');
    // Swap languages for bidirectional conversation
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getLanguageName = (code: string) => {
    return languages.find(lang => lang.code === code)?.name || code;
  };

  const getLanguageFlag = (code: string) => {
    return languages.find(lang => lang.code === code)?.flag || '🌐';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Volume2 className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  LinguaFluent Agent
                </h1>
              </div>
              <Badge variant="secondary" className="glass-card">
                Professional AI Translation
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={activeView === 'conversation' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('conversation')}
              >
                <Mic className="h-4 w-4 mr-2" />
                Live Translation
              </Button>
              <Button
                variant={activeView === 'analytics' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('analytics')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button
                variant={activeView === 'settings' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {activeView === 'conversation' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Control Panel */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Translation Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Language Selection */}
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">From</Label>
                      <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              {lang.flag} {lang.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">To</Label>
                      <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              {lang.flag} {lang.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                   {/* Voice Controls */}
                  <div className="space-y-4">
                    <div className="flex justify-center space-x-3">
                      {!isRecording ? (
                        <Button
                          variant="voice"
                          size="voice-lg"
                          onClick={toggleRecording}
                          disabled={isTranslating}
                        >
                          <Mic className="h-8 w-8" />
                        </Button>
                      ) : (
                        <Button
                          variant="destructive"
                          size="voice-lg"
                          onClick={stopRecording}
                          className="animate-pulse"
                        >
                          <MicOff className="h-8 w-8" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        {isRecording ? 'Recording... Click to stop' : isTranslating ? 'Translating...' : 'Click to start recording'}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={switchSpeaker}
                      className="w-full"
                    >
                      Switch to Speaker {currentSpeaker === 'A' ? 'B' : 'A'}
                    </Button>
                  </div>

                   <Separator />

                   {/* Manual Text Input for Testing */}
                   <div className="space-y-3">
                     <Label className="text-sm font-medium">Test Translation</Label>
                     <div className="flex space-x-2">
                       <Input
                         placeholder="Type text to translate..."
                         value={textInput}
                         onChange={(e) => setTextInput(e.target.value)}
                         onKeyPress={(e) => e.key === 'Enter' && handleTextTranslation()}
                       />
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={handleTextTranslation}
                         disabled={isTranslating || !textInput.trim()}
                       >
                         <Send className="h-4 w-4" />
                       </Button>
                     </div>
                     <p className="text-xs text-muted-foreground">
                       For testing when voice recognition isn't available
                     </p>
                   </div>

                   <Separator />

                  {/* Session Stats */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Current Speaker:</span>
                      <Badge variant={currentSpeaker === 'A' ? 'default' : 'secondary'}>
                        Speaker {currentSpeaker}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Avg Accuracy:</span>
                        <span className={`font-medium ${accuracy >= 90 ? 'accuracy-high' : accuracy >= 80 ? 'accuracy-medium' : 'accuracy-low'}`}>
                          {accuracy}%
                        </span>
                      </div>
                      <Progress value={accuracy} className="h-2" />
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Session Time:</span>
                      <span className="font-mono">{formatTime(sessionTime)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Conversation Area */}
            <div className="lg:col-span-3">
              <ConversationView 
                messages={messages}
                currentSpeaker={currentSpeaker}
                isRecording={isRecording}
                isTranslating={isTranslating}
                getLanguageFlag={getLanguageFlag}
                getLanguageName={getLanguageName}
              />
            </div>
          </div>
        )}

        {activeView === 'analytics' && (
          <AnalyticsDashboard />
        )}

        {activeView === 'settings' && (
          <SettingsPanel />
        )}
      </div>
    </div>
  );
};