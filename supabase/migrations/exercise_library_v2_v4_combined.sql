-- ============================================================
-- Exercise Library V2+V3+V4 — Combined, idempotent migration
-- Child (3-6) target, yoga, speech, breathing & relaxation,
-- infant exercises (0-15m), baby leg exercises (4-15m)
--
-- SAFE TO RE-RUN: schema changes are idempotent, categories use
-- ON CONFLICT, exercises are guarded by NOT EXISTS on name_en.
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
  ('c0000001-0000-0000-0000-000000000020', 'יוגה לילדים',    'Kids Yoga',              'child', NULL, 36, 72, '#A78BFA', '🧘', 20),
  ('c0000001-0000-0000-0000-000000000021', 'שפה ודיבור',     'Speech & Language',      'child', NULL, 36, 72, '#3B82F6', '🗣️', 21),
  ('c0000001-0000-0000-0000-000000000022', 'נשימה והרפיה',   'Breathing & Relaxation', 'child', NULL, 36, 72, '#34D399', '🌬️', 22),
  ('c0000001-0000-0000-0000-000000000023', 'תנועה וכוח',     'Movement & Strength',    'child', NULL, 36, 72, '#F59E0B', '💪', 23),
  ('c0000001-0000-0000-0000-000000000014', 'נשימה והרפיה',   'Breathing & Relaxation', 'adult', 'relaxation', NULL, NULL, '#34D399', '🧘', 14)
ON CONFLICT (id) DO NOTHING;

-- ── EXERCISES (guarded against duplicates by name_en) ────────

INSERT INTO exercise_library
  (category_id, name, name_en, description, instructions, target, age_min_months, age_max_months, youtube_search_query, suggested_duration_minutes, suggested_frequency_count, suggested_frequency_per, difficulty, sort_order)
SELECT v.* FROM (VALUES

-- ══ V2: KIDS YOGA (36-72 months) ══════════════════════════════

  ('c0000001-0000-0000-0000-000000000020'::uuid, 'תנוחת העץ'::text, 'Tree Pose'::text,
   'Balance pose that builds focus, core strength and body awareness. Kids love pretending to be a tall tree swaying in the wind.'::text,
   E'1. Stand tall with feet together\n2. Place one foot on the opposite ankle or calf (not the knee)\n3. Raise arms up like branches\n4. Hold for 5-10 seconds, then switch sides\n5. Make it fun: sway gently like wind in the branches'::text,
   'child'::text, 36::int, 72::int, 'tree pose yoga for kids'::text, NULL::int, 1::int, 'day'::text, 'easy'::text, 1::int),

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

-- ══ V2: SPEECH & LANGUAGE (36-72 months) ══════════════════════

  ('c0000001-0000-0000-0000-000000000021', 'משחק חרוזים', 'Rhyming Game',
   'Phonological awareness activity — the foundation of reading. Finding words that sound alike trains the ear for language.',
   E'1. Say a simple word (cat, ball, sun)\n2. Take turns finding words that rhyme\n3. Silly made-up words are allowed and fun!\n4. Aim for 5-6 rounds',
   'child', 36, 72, 'rhyming games for preschoolers speech', 5, 1, 'day', 'easy', 10),

  ('c0000001-0000-0000-0000-000000000021', 'אני רואה משהו ש...', 'Sound I-Spy',
   'I-Spy with first sounds ("I spy something that starts with mmm..."). Builds sound-letter awareness and vocabulary.',
   E'1. Pick an object in the room\n2. Say: "I spy something that starts with [first sound]"\n3. Child guesses, then switch roles\n4. Play 5-10 rounds',
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
   E'1. Give a 2-step instruction first, and if easy move to 3 steps\n2. Say it once only — no repeating\n3. Make the actions silly and fun\n4. Switch: let the child give YOU instructions\n5. 5-6 rounds',
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

-- ══ V2: BREATHING & RELAXATION — CHILD (36-72 months) ═════════

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

-- ══ V2: MOVEMENT & STRENGTH — CHILD (36-72 months) ════════════

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

-- ══ V2: ADULT — BREATHING & RELAXATION ════════════════════════

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
   E'1. Lie down, eyes closed\n2. Bring attention to the toes — just notice sensations\n3. Slowly move attention upward through each body part\n4. Where you find tension, breathe "into" it\n5. 10-20 minutes, guided audio recommended',
   'adult', NULL, NULL, 'body scan meditation guided 10 minutes', 15, 3, 'week', 'medium', 44),

  ('c0000001-0000-0000-0000-000000000014', 'שחרור צוואר-כתפיים בנשימה', 'Breath-Linked Neck & Shoulder Release',
   'Combines gentle shoulder rolls and neck stretches with slow breathing. Ideal desk-break for tension headaches.',
   E'1. Sit tall. Inhale — raise shoulders to ears\n2. Exhale — roll them back and down\n3. Repeat 5 times\n4. Inhale center, exhale — ear toward shoulder, hold 3 breaths per side\n5. Finish with 5 slow belly breaths',
   'adult', NULL, NULL, 'neck shoulder release breathing exercise desk', 5, 2, 'day', 'easy', 45),

-- ══ V3: ROLLING (2-8 months) ══════════════════════════════════

  ('c0000001-0000-0000-0000-000000000001', 'תרגול גלגול מהגב לבטן', 'Back-to-Tummy Rolling Practice',
   'Guided rolling practice. Rolling is a major milestone (typically 4-6 months) that builds core strength and body awareness. Use a toy to motivate the turn.',
   E'1. Lay baby on the back\n2. Hold a favorite toy to one side, slightly above eye level\n3. As baby reaches, gently guide the top leg across the body\n4. Let baby complete the roll as much as possible on their own\n5. Practice both sides equally, 3-4 rolls per side',
   'toddler', 2, 8, 'teaching baby to roll over back to tummy', 5, 2, 'day', 'easy', 40),

  ('c0000001-0000-0000-0000-000000000001', 'תרגול גלגול מהבטן לגב', 'Tummy-to-Back Rolling Practice',
   'Usually the first roll a baby masters. Practicing from tummy time builds the push-and-tip motion using the arms and head.',
   E'1. Start in tummy time\n2. Encourage baby to push up on the arms\n3. Show a toy up and to the side so baby shifts weight and looks over the shoulder\n4. Gently assist the tip-over if needed\n5. Celebrate every roll! 3-4 per side',
   'toddler', 2, 7, 'baby rolling tummy to back practice', 5, 2, 'day', 'easy', 41),

  ('c0000001-0000-0000-0000-000000000001', 'גלגולים יחד על מזרן', 'Rolling Games Together',
   'Playful rolling for babies who already roll — rolling across a mat, "rolling like a log" together. Strengthens the whole body and vestibular system, and it''s hilarious.',
   E'1. Clear a soft, safe surface\n2. Lay baby on the back and encourage a few rolls in a row in one direction\n3. Roll alongside — babies love to imitate\n4. Sing a rolling song to make it a game\n5. 5 minutes of giggly play',
   'toddler', 6, 15, 'rolling games baby gross motor play', 5, 1, 'day', 'easy', 42),

-- ══ V3: TUMMY TIME & CORE (0-9 months) ════════════════════════

  ('c0000001-0000-0000-0000-000000000001', 'זמן בטן על החזה', 'Chest-to-Chest Tummy Time',
   'The gentlest tummy time for newborns — lying on the parent''s chest. Builds neck strength with maximum comfort and bonding.',
   E'1. Recline comfortably (45 degrees)\n2. Place baby tummy-down on your chest\n3. Talk and make faces so baby lifts the head to look at you\n4. Start with 1-2 minutes, several times a day\n5. Great after diaper changes and before naps',
   'toddler', 0, 4, 'newborn tummy time on chest', 3, 3, 'day', 'easy', 43),

  ('c0000001-0000-0000-0000-000000000001', 'זמן בטן עם גליל', 'Tummy Time Over a Roll',
   'A rolled towel under the chest makes tummy time easier and helps babies who protest it. Encourages weight-bearing on forearms.',
   E'1. Roll a small towel and place it under baby''s chest, arms forward over the roll\n2. Get down face-to-face, use a mirror or high-contrast toy\n3. Aim for baby pushing up and holding the head at 45-90 degrees\n4. 3-5 minutes, a few times a day',
   'toddler', 1, 6, 'tummy time with towel roll baby', 5, 3, 'day', 'easy', 44),

  ('c0000001-0000-0000-0000-000000000001', 'משיכה לישיבה', 'Pull-to-Sit',
   'Assisted pull from lying to sitting. Strengthens neck and tummy muscles and teaches head control. Only when baby holds the head steadily.',
   E'1. Baby on the back, hold their hands/forearms\n2. Slowly pull up toward sitting while baby engages\n3. Watch that the head follows without flopping back — if it lags, wait a few weeks\n4. Lower back down slowly (that''s exercise too!)\n5. 3-5 gentle repetitions',
   'toddler', 3, 8, 'pull to sit exercise baby head control', NULL, 1, 'day', 'medium', 45),

  ('c0000001-0000-0000-0000-000000000001', 'ישיבה עם תמיכה ומגדל כריות', 'Supported Sitting Play',
   'Practicing sitting with pillow support builds trunk control. Playing with toys while sitting challenges balance safely.',
   E'1. Sit baby on the floor surrounded by pillows\n2. Sit behind as a backstop\n3. Offer toys at chest height — reaching challenges balance\n4. Slowly reduce support as baby gets steadier\n5. 5-10 minutes of play',
   'toddler', 4, 9, 'supported sitting practice baby', 10, 2, 'day', 'easy', 46),

-- ══ V3: REACHING & EARLY FINE MOTOR (2-14 months) ═════════════

  ('c0000001-0000-0000-0000-000000000002', 'הושטה לצעצוע תלוי', 'Reaching for Hanging Toys',
   'Batting and reaching at dangling toys develops hand-eye coordination and shoulder control — the foundation for grasping.',
   E'1. Lay baby under a play gym or hold a toy 20-25 cm above the chest\n2. Shake it gently to attract attention\n3. Wait — let baby initiate the reach\n4. Move it slightly left/right so both hands work\n5. 5 minutes of play',
   'toddler', 2, 6, 'baby reaching for toys play gym development', 5, 2, 'day', 'easy', 47),

  ('c0000001-0000-0000-0000-000000000002', 'העברה מיד ליד', 'Hand-to-Hand Transfer',
   'Passing a toy from one hand to the other (around 5-7 months) shows the two sides of the brain working together.',
   E'1. Offer a light, easy-to-hold toy to one hand\n2. Then offer a second toy to the SAME hand\n3. Baby must transfer the first toy to take the new one\n4. Practice with rings, rattles, soft blocks\n5. 5 minutes during floor play',
   'toddler', 4, 9, 'baby hand to hand transfer toy', 5, 1, 'day', 'easy', 48),

  ('c0000001-0000-0000-0000-000000000002', 'אחיזת צבת - חפצים קטנים', 'Pincer Grasp Practice',
   'Picking up small items with thumb and finger (8-12 months). Practice with soft puffs or cereal under close supervision.',
   E'1. Place a few baby-safe puffs on the highchair tray\n2. Let baby work to pick them up — don''t rush to help\n3. Model the motion slowly yourself\n4. ALWAYS supervise closely (choking safety)\n5. A few minutes at snack time',
   'toddler', 8, 14, 'pincer grasp development baby activities', 5, 1, 'day', 'medium', 49),

-- ══ V3: SENSORY & BONDING (0-15 months) ═══════════════════════

  ('c0000001-0000-0000-0000-000000000003', 'עיסוי תינוקות', 'Baby Massage',
   'Gentle massage supports body awareness, digestion, sleep and bonding. Best after bath, in a warm room.',
   E'1. Warm a little baby-safe oil in your hands\n2. Legs first: gentle strokes from thigh to ankle\n3. Tummy: clockwise circles (helps digestion)\n4. Arms, then back\n5. Watch baby''s cues — stop if fussy\n6. 5-10 minutes',
   'toddler', 0, 12, 'baby massage tutorial infant', 10, 3, 'week', 'easy', 50),

  ('c0000001-0000-0000-0000-000000000003', 'אופני אוויר', 'Bicycle Legs',
   'Gently cycling baby''s legs relieves gas and builds hip mobility and body awareness. A classic that babies enjoy.',
   E'1. Baby on the back on a firm surface\n2. Hold the lower legs and cycle them slowly like riding a bike\n3. Add a song with a rhythm\n4. Then press both knees gently to the tummy and release\n5. 1-2 minutes, great during diaper changes',
   'toddler', 0, 8, 'bicycle legs exercise baby gas relief', 3, 2, 'day', 'easy', 51),

  ('c0000001-0000-0000-0000-000000000003', 'מגע בטקסטורות', 'Texture Exploration',
   'Touching different textures (soft, bumpy, crinkly, cool) wires the sensory system. Simple household items are perfect.',
   E'1. Gather safe items: silk scarf, sponge, crinkly paper, cold spoon, fluffy towel\n2. Brush each gently on baby''s hands, feet, arms\n3. Name each feeling: "soft!", "cold!"\n4. Older babies: let them grab and explore\n5. 5 minutes of exploration',
   'toddler', 1, 15, 'sensory texture play for babies', 5, 3, 'week', 'easy', 52),

-- ══ V3: EARLY COMMUNICATION (0-15 months) ═════════════════════

  ('c0000001-0000-0000-0000-000000000004', 'שיחות מבטים ופרצופים', 'Face Time & Serve-and-Return',
   'Face-to-face "conversations" — imitating baby''s sounds and expressions and waiting for a response — are the single best early language builder.',
   E'1. Hold baby 25-30 cm from your face\n2. When baby coos — imitate the sound back\n3. Pause and WAIT for baby''s "answer"\n4. Exaggerate expressions: surprise, smile, "ooo"\n5. A few minutes, many times a day',
   'toddler', 0, 8, 'serve and return interaction baby language', 5, 3, 'day', 'easy', 53),

  ('c0000001-0000-0000-0000-000000000004', 'שירים עם תנועות ידיים', 'Action Songs & Rhymes',
   'Songs with hand motions (clapping, waving, itsy-bitsy spider) combine language, rhythm, imitation and motor skills.',
   E'1. Pick 2-3 songs with simple motions\n2. Sing slowly, exaggerating the movements\n3. Guide baby''s hands through the motions at first\n4. Repeat the same songs daily — repetition is how they learn\n5. Watch for baby starting the motion alone!',
   'toddler', 4, 15, 'action songs for babies hand movements', 5, 2, 'day', 'easy', 54),

-- ══ V4: BABY LEG & LOWER-BODY (3-15 months) ═══════════════════

  ('c0000001-0000-0000-0000-000000000001', 'בעיטות למטרה', 'Kick the Toy',
   'Hang or hold a rattle, balloon or crinkly toy above baby''s feet and let them kick it. Builds leg strength, coordination and cause-and-effect understanding — babies love the instant feedback.',
   E'1. Lay baby on the back\n2. Hold a light toy, balloon or crinkly paper 10-15 cm above the feet\n3. Wait for a kick — react with excitement every time it connects!\n4. Move it slightly so each leg gets a turn\n5. 3-5 minutes of play',
   'toddler', 3, 9, 'baby kicking toy play leg development', 5, 2, 'day', 'easy', 60),

  ('c0000001-0000-0000-0000-000000000001', 'בעיטות נגד כפות הידיים', 'Resistance Kicks',
   'Baby pushes and kicks against your palms. The gentle resistance strengthens hips, knees and ankles — the same push pattern used later for crawling and standing.',
   E'1. Baby on the back, hold your palms against the soles of the feet\n2. Let baby push and kick against your hands\n3. Give light resistance — enough to feel, not to block\n4. When baby pushes strongly, let the legs extend fully like a "launch"\n5. 2-3 minutes, add sound effects!',
   'toddler', 3, 9, 'baby resistance kicking exercise legs', 3, 2, 'day', 'easy', 61),

  ('c0000001-0000-0000-0000-000000000001', 'כפות רגליים לפה', 'Feet to Mouth Play',
   'Grabbing the feet and bringing them up (around 4-6 months) stretches the hips, strengthens the tummy and builds body awareness. Adding sock-rattles makes the feet irresistible.',
   E'1. Baby on the back\n2. Put colorful socks or wrist-rattles on the feet\n3. Encourage grabbing the feet — guide hands to feet if needed\n4. Gently rock side to side while holding ("happy baby")\n5. A few minutes during diaper changes',
   'toddler', 3, 8, 'baby grabbing feet happy baby play', 3, 2, 'day', 'easy', 62),

  ('c0000001-0000-0000-0000-000000000001', 'קפיצות על הברכיים', 'Supported Standing & Bouncing',
   'Holding baby upright to bear weight and bounce on your lap. Weight-bearing through the legs (from ~5 months) builds bone strength and the standing reflex — and it''s a favorite game.',
   E'1. Sit baby facing you, hold firmly under the arms\n2. Let the feet rest flat on your thighs\n3. Let baby push and bounce — support the weight, don''t force standing\n4. Add a bouncing song for rhythm\n5. 2-3 minutes, stop when baby tires',
   'toddler', 4, 10, 'baby supported standing bouncing lap', 3, 2, 'day', 'easy', 63),

  ('c0000001-0000-0000-0000-000000000001', 'גשר קטן', 'Baby Bridges',
   'Gently lifting baby''s hips while the feet stay planted. Activates glutes and hamstrings — muscles needed for crawling and pulling to stand.',
   E'1. Baby on the back, knees bent, feet flat on the mat\n2. Hold the feet in place with one hand\n3. With the other hand, gently lift under the hips 2-3 cm\n4. Hold 2-3 seconds, lower slowly\n5. 5-8 lifts, older babies start pushing up themselves',
   'toddler', 5, 12, 'baby bridge exercise hips physio', NULL, 1, 'day', 'medium', 64),

  ('c0000001-0000-0000-0000-000000000001', 'נדנוד על שש', 'All-Fours Rocking',
   'Rocking back and forth on hands and knees is the direct precursor to crawling. Helping baby into the position and rocking builds the strength and rhythm for those first crawls.',
   E'1. Help baby into hands-and-knees position (support under the tummy)\n2. Gently rock them forward and back a few times\n3. Place a toy just out of reach ahead\n4. If baby collapses — that''s fine, try short rounds\n5. 2-3 minutes, a few times a day',
   'toddler', 6, 11, 'baby rocking hands and knees crawling prep', 3, 2, 'day', 'medium', 65),

  ('c0000001-0000-0000-0000-000000000001', 'זחילה עם מגבת', 'Towel-Assisted Crawling',
   'A towel under the chest takes part of baby''s weight so they can practice the arm-leg crawling pattern before they''re strong enough alone.',
   E'1. Roll a towel and place it under baby''s chest and tummy\n2. Lift slightly so some weight is off the arms\n3. Place a motivating toy ahead\n4. Let the arms and legs practice the crawl motion\n5. Short rounds — 1-2 minutes, celebrate progress',
   'toddler', 6, 11, 'towel assisted crawling exercise baby', 3, 1, 'day', 'medium', 66),

  ('c0000001-0000-0000-0000-000000000001', 'מסלול זחילה עם מכשולים', 'Crawl-Over Obstacle Path',
   'Once crawling starts, crawling OVER things (pillow, parent''s leg, folded blanket) builds leg power, motor planning and confidence.',
   E'1. Lay a pillow or your leg across baby''s crawling path\n2. Put a favorite toy on the far side\n3. Let baby figure out how to climb over\n4. Add more obstacles as skill grows\n5. 5-10 minutes of supervised play',
   'toddler', 8, 15, 'baby crawling over obstacles pillow course', 10, 1, 'day', 'medium', 67),

  ('c0000001-0000-0000-0000-000000000001', 'מעמידה לישיבה וחזרה', 'Sit-to-Stand Practice',
   'Practicing the transition from sitting to standing while holding your hands or furniture. Builds the thigh strength needed for independent standing and walking.',
   E'1. Baby sits on a low stool or your knee, feet flat on the floor\n2. Hold hands and encourage pushing up to stand ("Up!")\n3. Then guide slowly back down to sit ("Down!") — the slow lowering is the real workout\n4. 5-8 repetitions with a song\n5. From ~9 months: practice at the couch instead of your hands',
   'toddler', 8, 15, 'sit to stand exercise baby physio', NULL, 1, 'day', 'medium', 68),

  ('c0000001-0000-0000-0000-000000000001', 'הליכה לאורך הספה', 'Cruising Along the Couch',
   'Side-stepping while holding furniture (cruising) is the last stage before walking. Placing toys along the couch motivates those side steps.',
   E'1. Stand baby holding the couch\n2. Place a toy 30-40 cm to the side along the couch\n3. Encourage side-stepping toward it\n4. Move the toy again... and again\n5. Practice both directions, 5-10 minutes of play',
   'toddler', 9, 15, 'baby cruising furniture practice walking', 10, 1, 'day', 'medium', 69),

  ('c0000001-0000-0000-0000-000000000003', 'בעיטות באמבטיה', 'Bathtub Splash Kicks',
   'Kicking in water is leg exercise with sensory joy — the water gives resistance and every kick makes a splash. A perfect end-of-day leg workout.',
   E'1. During bath time, support baby safely\n2. Encourage kicking — show splashing with your hand\n3. Cheer every splash!\n4. Try holding baby on the tummy briefly for "swimming" kicks\n5. 2-3 minutes within bath time — never leave baby unattended in water',
   'toddler', 3, 12, 'baby splashing kicking bath time play', 3, 3, 'week', 'easy', 70),

  ('c0000001-0000-0000-0000-000000000003', 'יחף על טקסטורות', 'Barefoot Texture Walk',
   'Standing and stepping barefoot on different surfaces (grass, carpet, foam mat, sand) develops foot strength, balance reactions and sensory maps of the feet.',
   E'1. From supported standing age, hold baby upright barefoot\n2. Let the feet touch: carpet, cool floor, grass, a cushion\n3. Name each feeling, watch the toes react and grip\n4. For cruisers/walkers: a little texture path on the floor\n5. 5 minutes of exploration',
   'toddler', 6, 15, 'barefoot sensory walk baby foot development', 5, 3, 'week', 'easy', 71)

) AS v(category_id, name, name_en, description, instructions, target, age_min_months, age_max_months, youtube_search_query, suggested_duration_minutes, suggested_frequency_count, suggested_frequency_per, difficulty, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM exercise_library e WHERE e.name_en = v.name_en
);

-- Sanity check: how many exercises exist now, by target
SELECT target, count(*) FROM exercise_library GROUP BY target ORDER BY target;
