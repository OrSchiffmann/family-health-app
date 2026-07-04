-- ============================================================
-- Exercise Library V2 — Child (3-6) target, Yoga, Speech,
-- Breathing & Relaxation content
-- Run ONCE in Supabase SQL Editor
-- ============================================================

-- ── SCHEMA: allow 'child' target ─────────────────────────────

ALTER TABLE exercise_library_categories DROP CONSTRAINT IF EXISTS exercise_library_categories_target_check;
ALTER TABLE exercise_library_categories ADD CONSTRAINT exercise_library_categories_target_check
  CHECK (target IN ('toddler', 'child', 'adult'));

ALTER TABLE exercise_library DROP CONSTRAINT IF EXISTS exercise_library_target_check;
ALTER TABLE exercise_library ADD CONSTRAINT exercise_library_target_check
  CHECK (target IN ('toddler', 'child', 'adult'));

-- ── NEW CATEGORIES ────────────────────────────────────────────

INSERT INTO exercise_library_categories
  (id, name, name_en, target, body_area, age_min_months, age_max_months, color, emoji, sort_order)
VALUES
  -- Child (3-6) categories
  ('c0000001-0000-0000-0000-000000000020', 'יוגה לילדים',    'Kids Yoga',              'child', NULL, 36, 72, '#A78BFA', '🧘', 20),
  ('c0000001-0000-0000-0000-000000000021', 'שפה ודיבור',     'Speech & Language',      'child', NULL, 36, 72, '#3B82F6', '🗣️', 21),
  ('c0000001-0000-0000-0000-000000000022', 'נשימה והרפיה',   'Breathing & Relaxation', 'child', NULL, 36, 72, '#34D399', '🌬️', 22),
  ('c0000001-0000-0000-0000-000000000023', 'תנועה וכוח',     'Movement & Strength',    'child', NULL, 36, 72, '#F59E0B', '💪', 23),
  -- Adult relaxation category (new body area: relaxation)
  ('c0000001-0000-0000-0000-000000000014', 'נשימה והרפיה',   'Breathing & Relaxation', 'adult', 'relaxation', NULL, NULL, '#34D399', '🧘', 14)
ON CONFLICT (id) DO NOTHING;

-- ── KIDS YOGA (36-72 months) ─────────────────────────────────

INSERT INTO exercise_library
  (category_id, name, name_en, description, instructions, target, age_min_months, age_max_months, youtube_search_query, suggested_duration_minutes, suggested_frequency_count, suggested_frequency_per, difficulty, sort_order)
VALUES
  ('c0000001-0000-0000-0000-000000000020', 'תנוחת העץ', 'Tree Pose',
   'Balance pose that builds focus, core strength and body awareness. Kids love pretending to be a tall tree swaying in the wind.',
   E'1. Stand tall with feet together\n2. Place one foot on the opposite ankle or calf (not the knee)\n3. Raise arms up like branches\n4. Hold for 5-10 seconds, then switch sides\n5. Make it fun: sway gently like wind in the branches',
   'child', 36, 72, 'tree pose yoga for kids', NULL, 1, 'day', 'easy', 1),

  ('c0000001-0000-0000-0000-000000000020', 'חתול-פרה', 'Cat-Cow Stretch',
   'Gentle spine mobility exercise. Arching and rounding the back like a cat and a cow improves posture and body control.',
   E'1. Start on hands and knees\n2. "Cat": round the back up high and tuck the chin — meow!\n3. "Cow": drop the belly, lift the head — moo!\n4. Alternate slowly 5-8 times with the animal sounds',
   'child', 36, 72, 'cat cow pose kids yoga', NULL, 1, 'day', 'easy', 2),

  ('c0000001-0000-0000-0000-000000000020', 'כלב מביט מטה', 'Downward Dog',
   'Full-body stretch that strengthens arms and shoulders while stretching the back and legs. A playful upside-down view of the world.',
   E'1. Start on hands and knees\n2. Lift hips up high to make a triangle shape\n3. Press hands into the floor, straighten legs as much as comfortable\n4. Hold 5-10 seconds — try barking like a dog!\n5. Rest and repeat 3 times',
   'child', 36, 72, 'downward dog yoga pose for kids', NULL, 1, 'day', 'easy', 3),

  ('c0000001-0000-0000-0000-000000000020', 'תנוחת הפרפר', 'Butterfly Pose',
   'Seated hip-opening stretch. Flapping the "wings" makes it playful while gently stretching the inner thighs.',
   E'1. Sit with the soles of the feet together\n2. Hold the feet with both hands\n3. Flap the knees up and down like butterfly wings\n4. Then sit still and breathe for 15-20 seconds',
   'child', 36, 72, 'butterfly pose yoga kids', NULL, 1, 'day', 'easy', 4),

  ('c0000001-0000-0000-0000-000000000020', 'תנוחת הקוברה', 'Cobra Pose',
   'Back-strengthening pose. Lifting the chest like a snake builds back extensor strength important for posture.',
   E'1. Lie on the tummy, hands under shoulders\n2. Slowly push the chest up, keeping hips on the floor\n3. Hiss like a snake!\n4. Hold 5 seconds, lower slowly\n5. Repeat 3-5 times',
   'child', 36, 72, 'cobra pose yoga for children', NULL, 1, 'day', 'easy', 5),

  ('c0000001-0000-0000-0000-000000000020', 'תנוחת הילד', 'Child''s Pose',
   'Calming resting pose. Great for winding down after active play or before bedtime.',
   E'1. Kneel and sit back on the heels\n2. Fold forward, forehead to the floor\n3. Arms stretched forward or alongside the body\n4. Breathe slowly and rest for 20-30 seconds',
   'child', 36, 72, 'childs pose yoga relaxation kids', NULL, 1, 'day', 'easy', 6),

  ('c0000001-0000-0000-0000-000000000020', 'רצף יוגה קצר', 'Mini Yoga Flow',
   'A short sequence combining 4-5 poses into a story (e.g., a walk in the forest). Builds stamina, memory and transitions between positions.',
   E'1. Choose 4-5 poses the child knows\n2. Link them into a story: "We are trees... now a dog runs... a snake appears..."\n3. Hold each pose 5-10 seconds\n4. End with child''s pose to calm down',
   'child', 36, 72, 'kids yoga story sequence', 10, 3, 'week', 'medium', 7),

-- ── SPEECH & LANGUAGE (36-72 months) ─────────────────────────

  ('c0000001-0000-0000-0000-000000000021', 'משחק חרוזים', 'Rhyming Game',
   'Phonological awareness activity — the foundation of reading. Finding words that sound alike trains the ear for language.',
   E'1. Say a simple word (cat, ball, sun)\n2. Take turns finding words that rhyme\n3. Silly made-up words are allowed and fun!\n4. Aim for 5-6 rounds',
   'child', 36, 72, 'rhyming games for preschoolers speech', 5, 1, 'day', 'easy', 10),

  ('c0000001-0000-0000-0000-000000000021', 'אני רואה משהו ש...', 'Sound I-Spy',
   'I-Spy with first sounds ("I spy something that starts with mmm..."). Builds sound-letter awareness and vocabulary.',
   E'1. Pick an object in the room\n2. Say: "I spy something that starts with [first sound]"\n3. Child guesses; then switch roles\n4. Play 5-10 rounds',
   'child', 36, 72, 'i spy phonics game preschool', 5, 1, 'day', 'easy', 11),

  ('c0000001-0000-0000-0000-000000000021', 'לספר את הסיפור מחדש', 'Story Retelling',
   'After reading a short book, the child retells it in their own words. Builds narrative skills, sequencing and memory.',
   E'1. Read a short, familiar story together\n2. Ask: "What happened first? And then? How did it end?"\n3. Use the pictures as prompts\n4. Praise any attempt — details grow with practice',
   'child', 36, 72, 'story retelling activity preschool language', 10, 3, 'week', 'medium', 12),

  ('c0000001-0000-0000-0000-000000000021', 'משחק ההפכים', 'Opposites Game',
   'Learning opposite pairs (big/small, hot/cold) expands vocabulary and abstract thinking.',
   E'1. Say a word — the child says the opposite\n2. Start easy: big, up, fast, happy\n3. Act them out with your body for extra fun\n4. 8-10 pairs per round',
   'child', 36, 72, 'opposites game preschool vocabulary', 5, 1, 'day', 'easy', 13),

  ('c0000001-0000-0000-0000-000000000021', 'הוראות בשלושה שלבים', 'Three-Step Directions',
   'Following multi-step instructions ("touch your nose, clap twice, sit down") builds auditory memory and comprehension.',
   E'1. Give a 2-step instruction first; if easy, move to 3 steps\n2. Say it once only — no repeating\n3. Make the actions silly and fun\n4. Switch: let the child give YOU instructions\n5. 5-6 rounds',
   'child', 36, 72, 'following directions activity kids speech therapy', 5, 3, 'week', 'medium', 14),

  ('c0000001-0000-0000-0000-000000000021', 'בועות סבון ונשיפות', 'Bubbles & Blowing',
   'Oral-motor exercise. Blowing bubbles, feathers or cotton balls strengthens lip and cheek muscles used in speech.',
   E'1. Blow soap bubbles — big slow breaths\n2. Race cotton balls across the table by blowing through a straw\n3. Try gentle blows vs. strong blows\n4. 5 minutes of play',
   'child', 36, 72, 'oral motor blowing exercises speech therapy kids', 5, 1, 'day', 'easy', 15),

  ('c0000001-0000-0000-0000-000000000021', 'לתאר את התמונה', 'Picture Description',
   'Describing a busy picture builds sentence structure, vocabulary and attention to detail.',
   E'1. Open a picture book with a busy scene\n2. Take turns: "I see a... that is..."\n3. Ask what/where/who/why questions\n4. Encourage full sentences\n5. 5-10 minutes',
   'child', 36, 72, 'picture description language activity preschool', 10, 3, 'week', 'medium', 16),

  ('c0000001-0000-0000-0000-000000000021', 'קטגוריות מהירות', 'Category Naming',
   'Naming items in a category (animals, foods, things in the kitchen) builds word retrieval speed and semantic organization.',
   E'1. Pick a category: animals, fruits, toys...\n2. Take turns naming items — how many can you find?\n3. Harder: only red things, only things with wheels\n4. 3-4 categories per session',
   'child', 36, 72, 'category naming game speech therapy', 5, 1, 'day', 'easy', 17),

-- ── BREATHING & RELAXATION — CHILD (36-72 months) ────────────

  ('c0000001-0000-0000-0000-000000000022', 'נשימת בלון', 'Balloon Breathing',
   'Deep belly breathing visualized as inflating a balloon in the tummy. Calms the nervous system and teaches self-regulation.',
   E'1. Sit or lie comfortably, hands on the belly\n2. Breathe in slowly through the nose — the "balloon" fills\n3. Breathe out slowly through the mouth — the balloon empties\n4. Repeat 5 breaths\n5. Great before sleep or after a tantrum',
   'child', 36, 72, 'balloon breathing exercise for kids calm', 3, 1, 'day', 'easy', 20),

  ('c0000001-0000-0000-0000-000000000022', 'נשימת דבורה', 'Bumblebee Breath',
   'Humming on the exhale ("bzzzz") lengthens the out-breath and creates a soothing vibration — very calming for children.',
   E'1. Sit comfortably, close the eyes if it feels nice\n2. Breathe in through the nose\n3. Breathe out humming like a bee: "bzzzzz"\n4. Repeat 5 times\n5. Try covering the ears gently for a stronger effect',
   'child', 36, 72, 'bumblebee breath kids yoga calm', 3, 1, 'day', 'easy', 21),

  ('c0000001-0000-0000-0000-000000000022', 'גוף ספגטי', 'Spaghetti Body',
   'Progressive muscle relaxation for kids: squeeze everything tight like uncooked spaghetti, then go soft like cooked spaghetti.',
   E'1. Lie on the back\n2. "Uncooked spaghetti!" — squeeze fists, legs, face for 5 seconds\n3. "Cooked spaghetti!" — let everything go soft and floppy\n4. Repeat 3-4 times\n5. End with slow belly breaths',
   'child', 36, 72, 'progressive muscle relaxation for children spaghetti', 5, 3, 'week', 'easy', 22),

  ('c0000001-0000-0000-0000-000000000022', 'דובי על הבטן', 'Teddy Bear Breathing',
   'Place a teddy bear on the belly and rock it to sleep with slow breaths. Makes diaphragmatic breathing visible and fun.',
   E'1. Lie down, place a teddy on the belly\n2. Breathe in slowly — the teddy rises\n3. Breathe out slowly — the teddy sinks\n4. Rock the teddy "to sleep" for 5-8 breaths',
   'child', 36, 72, 'teddy bear belly breathing kids mindfulness', 3, 1, 'day', 'easy', 23),

  ('c0000001-0000-0000-0000-000000000022', 'חמשת החושים', 'Five Senses Grounding',
   'Mindfulness game: notice 5 things you see, 4 you hear, 3 you touch, 2 you smell, 1 you taste. Builds attention and calm.',
   E'1. Sit together somewhere comfortable\n2. Find: 5 things you SEE\n3. 4 things you HEAR\n4. 3 things you can TOUCH\n5. 2 things you SMELL, 1 thing you TASTE\n6. Talk about them slowly',
   'child', 36, 72, '5 senses grounding exercise for kids', 5, 3, 'week', 'medium', 24),

-- ── MOVEMENT & STRENGTH — CHILD (36-72 months) ───────────────

  ('c0000001-0000-0000-0000-000000000023', 'הליכת חיות', 'Animal Walks',
   'Bear walk, crab walk, frog jumps — full-body strengthening disguised as play. Builds shoulder girdle and core strength.',
   E'1. Bear walk: hands and feet on floor, bottom up — walk across the room\n2. Crab walk: belly up, walk on hands and feet\n3. Frog jumps: squat and jump forward\n4. 2-3 lengths of the room per animal',
   'child', 36, 72, 'animal walks gross motor kids exercise', 10, 1, 'day', 'easy', 30),

  ('c0000001-0000-0000-0000-000000000023', 'מסלול מכשולים ביתי', 'Home Obstacle Course',
   'Crawl under chairs, jump over pillows, balance on a line of tape. Builds motor planning, balance and coordination.',
   E'1. Build a course: under the table, over 2 pillows, along a tape line, around a chair\n2. Demonstrate once, then let the child go\n3. Time it for extra motivation\n4. Change the order each round — 3-4 rounds',
   'child', 36, 72, 'home obstacle course kids gross motor', 15, 3, 'week', 'medium', 31),

  ('c0000001-0000-0000-0000-000000000023', 'קפיצות על רגל אחת', 'One-Foot Hops',
   'Hopping on one foot develops balance, leg strength and bilateral coordination — a key motor milestone for ages 4-6.',
   E'1. Stand on one foot, hold hands if needed\n2. Hop 3-5 times, then switch feet\n3. Progress: hop along a line, hop into hoops\n4. 3 sets per foot',
   'child', 48, 72, 'hopping one foot exercise kids', 5, 1, 'day', 'medium', 32),

  ('c0000001-0000-0000-0000-000000000023', 'תפיסת וזריקת כדור', 'Ball Throw & Catch',
   'Throwing and catching builds hand-eye coordination, timing and bilateral skills. Adjust ball size to skill level.',
   E'1. Start close (1-2 meters) with a large soft ball\n2. Throw underhand, catch with two hands\n3. Step back as it gets easier\n4. Progress: bounce-catch, throw at a target\n5. 10-15 throws',
   'child', 36, 72, 'ball catching skills kids development', 10, 1, 'day', 'easy', 33),

-- ── ADULT: BREATHING & RELAXATION ────────────────────────────

  ('c0000001-0000-0000-0000-000000000014', 'נשימה סרעפתית', 'Diaphragmatic Breathing',
   'Foundation of all relaxation work. Slow belly breathing activates the parasympathetic system, lowering stress and muscle tension.',
   E'1. Lie down or sit back, one hand on chest, one on belly\n2. Inhale through the nose 4 seconds — only the belly hand rises\n3. Exhale through pursed lips 6 seconds\n4. 10 breaths, 2-3 times a day',
   'adult', NULL, NULL, 'diaphragmatic breathing exercise tutorial', 5, 2, 'day', 'easy', 40),

  ('c0000001-0000-0000-0000-000000000014', 'נשימת קופסה', 'Box Breathing',
   'Inhale 4 — hold 4 — exhale 4 — hold 4. Used by athletes and military for rapid stress regulation and focus.',
   E'1. Sit upright, shoulders relaxed\n2. Inhale through the nose — count 4\n3. Hold — count 4\n4. Exhale — count 4\n5. Hold empty — count 4\n6. Repeat 4-6 cycles',
   'adult', NULL, NULL, 'box breathing technique 4x4', 5, 1, 'day', 'easy', 41),

  ('c0000001-0000-0000-0000-000000000014', 'נשימת 4-7-8', '4-7-8 Breathing',
   'Inhale 4, hold 7, exhale 8. The long exhale is deeply calming — excellent before sleep.',
   E'1. Sit or lie comfortably\n2. Inhale quietly through the nose — 4 counts\n3. Hold — 7 counts\n4. Exhale audibly through the mouth — 8 counts\n5. Repeat 4 cycles, ideally before bed',
   'adult', NULL, NULL, '4 7 8 breathing technique sleep', 5, 1, 'day', 'easy', 42),

  ('c0000001-0000-0000-0000-000000000014', 'הרפיית שרירים מתקדמת', 'Progressive Muscle Relaxation',
   'Systematically tense and release muscle groups from feet to face. Reduces chronic tension and improves sleep quality.',
   E'1. Lie down comfortably\n2. Tense the feet 5 seconds — release 10 seconds\n3. Move up: calves, thighs, glutes, belly, hands, arms, shoulders, face\n4. Notice the difference between tense and relaxed\n5. Full sequence takes 10-15 minutes',
   'adult', NULL, NULL, 'progressive muscle relaxation guided', 15, 3, 'week', 'medium', 43),

  ('c0000001-0000-0000-0000-000000000014', 'סריקת גוף', 'Body Scan Meditation',
   'Guided attention through the body from toes to head. Builds body awareness and releases unnoticed tension.',
   E'1. Lie down, eyes closed\n2. Bring attention to the toes — just notice sensations\n3. Slowly move attention upward through each body part\n4. Where you find tension, breathe "into" it\n5. 10-20 minutes; guided audio recommended',
   'adult', NULL, NULL, 'body scan meditation guided 10 minutes', 15, 3, 'week', 'medium', 44),

  ('c0000001-0000-0000-0000-000000000014', 'שחרור צוואר-כתפיים בנשימה', 'Breath-Linked Neck & Shoulder Release',
   'Combines gentle shoulder rolls and neck stretches with slow breathing. Ideal desk-break for tension headaches.',
   E'1. Sit tall; inhale — raise shoulders to ears\n2. Exhale — roll them back and down\n3. Repeat 5 times\n4. Inhale center; exhale — ear toward shoulder, hold 3 breaths per side\n5. Finish with 5 slow belly breaths',
   'adult', NULL, NULL, 'neck shoulder release breathing exercise desk', 5, 2, 'day', 'easy', 45);
