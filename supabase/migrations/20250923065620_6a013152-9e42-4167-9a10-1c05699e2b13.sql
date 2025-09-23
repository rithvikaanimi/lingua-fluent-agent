-- Fix RLS policies to allow authenticated users to create sessions and messages
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.conversation_sessions;
DROP POLICY IF EXISTS "Users can create their own sessions" ON public.conversation_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.conversation_sessions;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.translation_messages;
DROP POLICY IF EXISTS "Users can create their own messages" ON public.translation_messages;

-- Create updated RLS policies for conversation_sessions
CREATE POLICY "Allow authenticated users to view their sessions"
ON public.conversation_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to create sessions"
ON public.conversation_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to update their sessions"
ON public.conversation_sessions
FOR UPDATE
USING (auth.uid() = user_id);

-- Create updated RLS policies for translation_messages
CREATE POLICY "Allow authenticated users to view their messages"
ON public.translation_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_sessions
    WHERE conversation_sessions.id = translation_messages.session_id
    AND conversation_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Allow authenticated users to create messages"
ON public.translation_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversation_sessions
    WHERE conversation_sessions.id = translation_messages.session_id
    AND conversation_sessions.user_id = auth.uid()
  )
);

-- Create a profiles table for user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for profiles timestamp
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();