import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Settings, Volume2, Mic, Shield, Database, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserSettings {
  default_source_language: string;
  default_target_language: string;
  voice_settings: {
    speed: number;
    gender: string;
  };
  auto_save_conversations: boolean;
  noise_reduction: boolean;
  real_time_translation: boolean;
}

export const SettingsPanel = () => {
  const [settings, setSettings] = useState<UserSettings>({
    default_source_language: 'en',
    default_target_language: 'es',
    voice_settings: {
      speed: 1.0,
      gender: 'female',
    },
    auto_save_conversations: true,
    noise_reduction: true,
    real_time_translation: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const { toast } = useToast();

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

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      
      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (userProfile) {
        const voiceSettings = typeof userProfile.voice_settings === 'object' && userProfile.voice_settings 
          ? userProfile.voice_settings as { speed: number; gender: string }
          : { speed: 1.0, gender: 'female' };
          
        setSettings({
          default_source_language: userProfile.default_source_language || 'en',
          default_target_language: userProfile.default_target_language || 'es',
          voice_settings: voiceSettings,
          auto_save_conversations: userProfile.auto_save_conversations ?? true,
          noise_reduction: userProfile.noise_reduction ?? true,
          real_time_translation: userProfile.real_time_translation ?? true,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Settings Error",
        description: "Failed to load your settings.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to save settings.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.user.id,
          default_source_language: settings.default_source_language,
          default_target_language: settings.default_target_language,
          voice_settings: settings.voice_settings,
          auto_save_conversations: settings.auto_save_conversations,
          noise_reduction: settings.noise_reduction,
          real_time_translation: settings.real_time_translation,
        });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Save Error",
        description: "Failed to save your settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateVoiceSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      voice_settings: {
        ...prev.voice_settings,
        [key]: value,
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="glass-card">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-8 bg-muted rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
            Settings
          </h2>
          <p className="text-muted-foreground mt-1">
            Customize your professional translation experience
          </p>
        </div>
        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Language Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>Language Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="default-source">Default Source Language</Label>
              <Select 
                value={settings.default_source_language} 
                onValueChange={(value) => updateSetting('default_source_language', value)}
              >
                <SelectTrigger className="mt-2">
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
              <Label htmlFor="default-target">Default Target Language</Label>
              <Select 
                value={settings.default_target_language} 
                onValueChange={(value) => updateSetting('default_target_language', value)}
              >
                <SelectTrigger className="mt-2">
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

            <div className="flex items-center justify-between">
              <Label htmlFor="auto-detect">Auto-detect Language</Label>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Voice & Audio Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Volume2 className="h-5 w-5" />
              <span>Voice & Audio</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Voice Gender</Label>
              <Select 
                value={settings.voice_settings.gender} 
                onValueChange={(value) => updateVoiceSetting('gender', value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Speech Rate</Label>
              <div className="mt-2 space-y-2">
                <Slider
                  value={[settings.voice_settings.speed]}
                  onValueChange={([value]) => updateVoiceSetting('speed', value)}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>0.5x</span>
                  <span>Current: {settings.voice_settings.speed}x</span>
                  <span>2.0x</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="noise-reduction">Background Noise Reduction</Label>
                <p className="text-sm text-muted-foreground">
                  Filter out background noise for clearer voice recognition
                </p>
              </div>
              <Switch
                id="noise-reduction"
                checked={settings.noise_reduction}
                onCheckedChange={(checked) => updateSetting('noise_reduction', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Data Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Privacy & Data</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="auto-save">Auto-save Conversations</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically save translation sessions to your history
                </p>
              </div>
              <Switch
                id="auto-save"
                checked={settings.auto_save_conversations}
                onCheckedChange={(checked) => updateSetting('auto_save_conversations', checked)}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Data Retention</h4>
              <p className="text-sm text-muted-foreground">
                Your conversations are encrypted and stored securely. You can export or delete your data at any time.
              </p>
              <Button variant="outline" size="sm">
                Download My Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Translation Features */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Translation Features</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="real-time">Real-time Translation</Label>
                <p className="text-sm text-muted-foreground">
                  Enable instant translation as you speak
                </p>
              </div>
              <Switch
                id="real-time"
                checked={settings.real_time_translation}
                onCheckedChange={(checked) => updateSetting('real_time_translation', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Voice Response</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically speak translations aloud
                </p>
              </div>
              <Badge variant="default">Enabled</Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Auto Generate Meeting Summary</Label>
                <p className="text-sm text-muted-foreground">
                  AI-powered conversation summaries
                </p>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">AI Agent Features</h4>
              <p className="text-sm text-muted-foreground">
                Advanced AI capabilities for professional translations with context awareness and business terminology support.
              </p>
              <Badge variant="default" className="glass-card">
                ✨ AI Agent Active
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};