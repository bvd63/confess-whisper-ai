-- Add multilingual support to daily_prompts table
-- This allows prompts to be displayed in English, Spanish, and German

-- Rename existing prompt_text column to prompt_text_en (English)
ALTER TABLE public.daily_prompts 
  RENAME COLUMN prompt_text TO prompt_text_en;

-- Add columns for Spanish and German translations
ALTER TABLE public.daily_prompts
  ADD COLUMN prompt_text_es TEXT,
  ADD COLUMN prompt_text_de TEXT;

-- Update existing prompts with translations
-- Prompt 1: Happiness
UPDATE public.daily_prompts 
SET 
  prompt_text_en = 'What truly makes you happy and why?',
  prompt_text_es = '¿Qué te hace verdaderamente feliz y por qué?',
  prompt_text_de = 'Was macht dich wirklich glücklich und warum?'
WHERE prompt_text_en = 'Ce lucru te face cu adevărat fericit și de ce?';

-- Prompt 2: Reflection
UPDATE public.daily_prompts 
SET 
  prompt_text_en = 'If you could change something from your past, what would it be?',
  prompt_text_es = 'Si pudieras cambiar algo de tu pasado, ¿qué sería?',
  prompt_text_de = 'Wenn du etwas aus deiner Vergangenheit ändern könntest, was wäre es?'
WHERE prompt_text_en = 'Dacă ai putea schimba ceva din trecutul tău, ce ai schimba?';

-- Prompt 3: Fears
UPDATE public.daily_prompts 
SET 
  prompt_text_en = 'What is your greatest fear and how does it affect you?',
  prompt_text_es = '¿Cuál es tu mayor miedo y cómo te afecta?',
  prompt_text_de = 'Was ist deine größte Angst und wie beeinflusst sie dich?'
WHERE prompt_text_en = 'Care e cea mai mare teamă a ta și cum te afectează?';

-- Prompt 4: Achievement
UPDATE public.daily_prompts 
SET 
  prompt_text_en = 'Describe a moment when you felt truly proud of yourself',
  prompt_text_es = 'Describe un momento en que te sentiste verdaderamente orgulloso de ti mismo',
  prompt_text_de = 'Beschreibe einen Moment, in dem du wirklich stolz auf dich warst'
WHERE prompt_text_en = 'Descrie un moment când te-ai simțit cu adevărat mândru de tine';

-- Prompt 5: Wisdom
UPDATE public.daily_prompts 
SET 
  prompt_text_en = 'What advice would you give to your 5-years-ago self?',
  prompt_text_es = '¿Qué consejo le darías a tu yo de hace 5 años?',
  prompt_text_de = 'Welchen Rat würdest du deinem Ich von vor 5 Jahren geben?'
WHERE prompt_text_en = 'Ce sfat i-ai da versiunii tale de acum 5 ani?';

-- Prompt 6: Secrets
UPDATE public.daily_prompts 
SET 
  prompt_text_en = 'What is the secret you have never told anyone?',
  prompt_text_es = '¿Cuál es el secreto que nunca le has contado a nadie?',
  prompt_text_de = 'Was ist das Geheimnis, das du niemandem erzählt hast?'
WHERE prompt_text_en = 'Care e secretul pe care nu l-ai spus niciodată nimănui?';

-- Prompt 7: Goals
UPDATE public.daily_prompts 
SET 
  prompt_text_en = 'What do you want to achieve in the next month?',
  prompt_text_es = '¿Qué quieres lograr en el próximo mes?',
  prompt_text_de = 'Was möchtest du im nächsten Monat erreichen?'
WHERE prompt_text_en = 'Ce vrei să realizezi în următoarea lună?';

-- Add check constraint to ensure at least English translation exists
ALTER TABLE public.daily_prompts
  ADD CONSTRAINT daily_prompts_en_required 
  CHECK (prompt_text_en IS NOT NULL AND prompt_text_en != '');

-- Add comment explaining the multilingual structure
COMMENT ON COLUMN public.daily_prompts.prompt_text_en IS 'Daily prompt in English (required, fallback language)';
COMMENT ON COLUMN public.daily_prompts.prompt_text_es IS 'Daily prompt in Spanish (optional)';
COMMENT ON COLUMN public.daily_prompts.prompt_text_de IS 'Daily prompt in German (optional)';
