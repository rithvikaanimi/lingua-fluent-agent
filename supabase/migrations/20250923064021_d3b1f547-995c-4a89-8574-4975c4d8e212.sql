-- Create conversation sessions table
CREATE TABLE public.conversation_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT,
  source_language TEXT NOT NULL DEFAULT 'en',
  target_language TEXT NOT NULL DEFAULT 'es',
  session_duration INTEGER DEFAULT 0,
  average_accuracy DECIMAL(5,2) DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create translation messages table
CREATE TABLE public.translation_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.conversation_sessions(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL, -- 'A' or 'B'
  original_text TEXT NOT NULL,
  translated_text TEXT,
  original_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  confidence_score DECIMAL(5,2) DEFAULT 0.0,
  voice_gender TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user profiles table for additional settings
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  display_name TEXT,
  default_source_language TEXT DEFAULT 'en',
  default_target_language TEXT DEFAULT 'es',
  voice_settings JSONB DEFAULT '{"speed": 1.0, "gender": "female"}',
  auto_save_conversations BOOLEAN DEFAULT true,
  noise_reduction BOOLEAN DEFAULT true,
  real_time_translation BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for conversation_sessions
CREATE POLICY "Users can view their own sessions" 
ON public.conversation_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" 
ON public.conversation_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
ON public.conversation_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" 
ON public.conversation_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for translation_messages
CREATE POLICY "Users can view messages from their sessions" 
ON public.translation_messages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.conversation_sessions 
  WHERE id = session_id AND user_id = auth.uid()
));

CREATE POLICY "Users can create messages in their sessions" 
ON public.translation_messages 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.conversation_sessions 
  WHERE id = session_id AND user_id = auth.uid()
));

CREATE POLICY "Users can update messages in their sessions" 
ON public.translation_messages 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.conversation_sessions 
  WHERE id = session_id AND user_id = auth.uid()
));

-- Create policies for user_profiles
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.user_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_conversation_sessions_updated_at
BEFORE UPDATE ON public.conversation_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for real-time conversation updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.translation_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_sessions;