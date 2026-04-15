-- App Feedback table — stores user reviews/opinions for customer insight
-- Run this migration on your Supabase project

CREATE TABLE IF NOT EXISTS app_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating smallint CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  message text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE app_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON app_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own feedback (to check if they already submitted)
CREATE POLICY "Users can read own feedback"
  ON app_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Admin access: SECURITY DEFINER function to read all feedback
CREATE OR REPLACE FUNCTION get_all_feedback()
RETURNS SETOF app_feedback
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM app_feedback ORDER BY created_at DESC;
$$;
