-- Seed data for communities
-- Run this after the migration to populate initial communities

INSERT INTO public.communities (name, description, slug, category, icon, is_private) VALUES
('Mental Health Support', 'A safe space to discuss mental health, anxiety, depression, and emotional wellbeing.', 'mental-health-support', 'mental-health', '🧠', false),
('Relationship Advice', 'Share your relationship struggles, get advice, and connect with others going through similar experiences.', 'relationship-advice', 'relationships', '💕', false),
('Work & Career', 'Discuss workplace challenges, career decisions, and professional development.', 'work-career', 'work', '💼', false),
('Family Matters', 'Navigate family dynamics, parenting challenges, and family relationships.', 'family-matters', 'family', '👨‍👩‍👧‍👦', false),
('Anonymous Confessions', 'Share anything on your mind in complete anonymity. No judgment zone.', 'anonymous-confessions', 'general', '🎭', false),
('LGBTQ+ Community', 'A supportive space for LGBTQ+ individuals to share experiences and connect.', 'lgbtq-community', 'general', '🏳️‍🌈', false),
('College Life', 'University students sharing academic stress, social pressures, and campus life.', 'college-life', 'general', '🎓', false),
('New Parents', 'Support group for new parents navigating the challenges of parenthood.', 'new-parents', 'family', '👶', false),
('Grief & Loss', 'A compassionate community for those dealing with loss and grief.', 'grief-loss', 'mental-health', '🕊️', false),
('Financial Struggles', 'Discuss money worries, debt, and financial planning in a judgment-free space.', 'financial-struggles', 'other', '💰', false);

-- Note: These communities will have member_count = 0 initially
-- Users will join them organically
