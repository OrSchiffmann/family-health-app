-- ============================================================
-- Exercise Library — Schema, RLS & Seed Data
-- Run in Supabase SQL Editor
-- ============================================================

-- ── TABLES ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exercise_library_categories (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,                         -- Hebrew display name
  name_en        text,
  target         text NOT NULL CHECK (target IN ('toddler', 'adult')),
  body_area      text,                                  -- adult: 'neck' | 'pelvic_floor' | 'back' | 'knee'
  age_min_months int,                                   -- toddler: min age in months
  age_max_months int,                                   -- toddler: max age in months
  color          text DEFAULT '#0AB5B5',
  emoji          text,
  sort_order     int DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exercise_library (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id                uuid REFERENCES exercise_library_categories(id) ON DELETE SET NULL,
  name                       text NOT NULL,             -- Hebrew
  name_en                    text,
  description                text,                     -- English description
  instructions               text,                     -- Step-by-step
  target                     text NOT NULL CHECK (target IN ('toddler', 'adult')),
  age_min_months             int,                      -- toddler: min age
  age_max_months             int,                      -- toddler: max age
  body_area                  text,                     -- adult: which body part
  youtube_url                text,                     -- specific video URL (optional)
  youtube_search_query       text,                     -- search query to find a good video
  suggested_duration_minutes int,
  suggested_frequency_count  int DEFAULT 1,
  suggested_frequency_per    text DEFAULT 'day' CHECK (suggested_frequency_per IN ('day', 'week')),
  difficulty                 text DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  tags                       text[] DEFAULT '{}',
  is_active                  boolean DEFAULT true,
  sort_order                 int DEFAULT 0,
  created_at                 timestamptz DEFAULT now()
);

-- Add birth_date to members table (used by the questionnaire to filter by age)
ALTER TABLE members ADD COLUMN IF NOT EXISTS birth_date date;

-- ── RLS ─────────────────────────────────────────────────────

ALTER TABLE exercise_library_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth users can read exercise categories" ON exercise_library_categories;
CREATE POLICY "Auth users can read exercise categories"
  ON exercise_library_categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth users can read exercises" ON exercise_library;
CREATE POLICY "Auth users can read exercises"
  ON exercise_library FOR SELECT TO authenticated USING (true);

-- ── CATEGORIES ──────────────────────────────────────────────

INSERT INTO exercise_library_categories
  (id, name, name_en, target, body_area, age_min_months, age_max_months, color, emoji, sort_order)
VALUES
  -- Toddler categories (filtered by age at query time, not category)
  ('c0000001-0000-0000-0000-000000000001', 'תנועה גסה',        'Gross Motor',             'toddler', NULL,          0,    36, '#F59E0B', '🏃', 1),
  ('c0000001-0000-0000-0000-000000000002', 'מוטוריקה עדינה',   'Fine Motor',              'toddler', NULL,          0,    36, '#8B5CF6', '✋', 2),
  ('c0000001-0000-0000-0000-000000000003', 'חוש ותחושה',       'Sensory',                 'toddler', NULL,          0,    36, '#EC4899', '🌈', 3),
  ('c0000001-0000-0000-0000-000000000004', 'שפה ותקשורת',      'Language & Communication','toddler', NULL,          0,    36, '#3B82F6', '💬', 4),
  ('c0000001-0000-0000-0000-000000000005', 'חברתי-קוגניטיבי', 'Social & Cognitive',      'toddler', NULL,          0,    36, '#10B981', '🧠', 5),
  -- Adult physiotherapy categories
  ('c0000001-0000-0000-0000-000000000010', 'פיזיותרפיה לצוואר','Neck Physiotherapy',      'adult',   'neck',        NULL, NULL,'#0AB5B5','🦴', 10),
  ('c0000001-0000-0000-0000-000000000011', 'רצפת אגן',         'Pelvic Floor',            'adult',   'pelvic_floor',NULL, NULL,'#F472B6','⚕️', 11),
  ('c0000001-0000-0000-0000-000000000012', 'פיזיותרפיה לגב',   'Back Physiotherapy',      'adult',   'back',        NULL, NULL,'#6366F1','🔙', 12),
  ('c0000001-0000-0000-0000-000000000013', 'פיזיותרפיה לברכיים','Knee Physiotherapy',     'adult',   'knee',        NULL, NULL,'#F59E0B','🦵', 13)
ON CONFLICT (id) DO NOTHING;

-- ── TODDLER EXERCISES ───────────────────────────────────────

INSERT INTO exercise_library
  (id, category_id, name, name_en, description, instructions, target,
   age_min_months, age_max_months,
   youtube_search_query, suggested_duration_minutes,
   suggested_frequency_count, suggested_frequency_per, difficulty, tags, sort_order)
VALUES

  -- ── Gross Motor: 0–6 months ────────────────────────────────
  ('e0000001-0000-0000-0000-000000000001',
   'c0000001-0000-0000-0000-000000000001',
   'זמן כרס', 'Tummy Time',
   'Tummy time strengthens neck, back and shoulder muscles and is the single most important activity for 0–6 month motor development. Also prevents positional flat head (plagiocephaly).',
   '1. Place baby on a firm, flat surface on their tummy while awake and supervised. 2. Get down to eye level and use toys or your face to encourage head lifting. 3. Start with 2–3 minutes, 3–5 times per day. 4. Can be done on your chest or lap at first if baby resists.',
   'toddler', 0, 6,
   'tummy time exercises newborn how to benefits',
   5, 5, 'day', 'easy', ARRAY['motor','strength','newborn','neck'], 1),

  ('e0000001-0000-0000-0000-000000000002',
   'c0000001-0000-0000-0000-000000000001',
   'מעקב עיניים', 'Visual Tracking',
   'Visual tracking develops eye coordination, focus, and brain connectivity. Newborns see best at 20–30 cm — the distance of your face during feeding.',
   '1. Hold a high-contrast black-and-white card or colorful toy 20–30 cm from baby''s face. 2. Slowly move it side to side and watch eyes follow. 3. As baby develops (2–3 months), move it in an arc and vertically.',
   'toddler', 0, 4,
   'visual tracking baby 0-3 months development',
   5, 3, 'day', 'easy', ARRAY['vision','sensory','newborn'], 2),

  ('e0000001-0000-0000-0000-000000000003',
   'c0000001-0000-0000-0000-000000000001',
   'הרמת ראש בכרס', 'Head Lifting in Tummy Time',
   'A progression from basic tummy time: encourages active head lifting and holding, building cervical extensor strength.',
   '1. Place baby on tummy. 2. Position a mirror or toy in front at floor level. 3. Encourage them to lift head to see it. 4. Celebrate every lift! 5. Can place a small rolled towel under chest to help.',
   'toddler', 1, 5,
   'baby head control tummy time 2 months neck strength',
   5, 3, 'day', 'easy', ARRAY['motor','neck','strength'], 3),

  -- ── Gross Motor: 6–12 months ───────────────────────────────
  ('e0000001-0000-0000-0000-000000000010',
   'c0000001-0000-0000-0000-000000000001',
   'הכנה לזחילה', 'Crawling Preparation',
   'Crawling is critical for cross-body coordination and bilateral brain development. These drills help babies go from tummy time to independent crawling.',
   '1. Place baby on all fours and support the belly. 2. Gently rock forward and back to load and unload arms. 3. Place a favourite toy just out of reach to motivate forward movement. 4. Allow floor time daily for self-exploration.',
   'toddler', 6, 10,
   'baby crawling preparation exercises 6 months',
   10, 2, 'day', 'easy', ARRAY['motor','crawling','core'], 10),

  ('e0000001-0000-0000-0000-000000000011',
   'c0000001-0000-0000-0000-000000000001',
   'ישיבה עם תמיכה', 'Supported Sitting',
   'Develops core strength and balance for independent sitting. Start with full support and gradually reduce assistance as strength improves.',
   '1. Sit baby between your legs for support, or use a nursing pillow. 2. Slowly shift baby slightly off-centre and let them self-correct. 3. Place toys in front to encourage reaching while sitting.',
   'toddler', 4, 8,
   'baby sitting exercises 4-6 months supported',
   10, 3, 'day', 'easy', ARRAY['motor','sitting','balance','core'], 11),

  ('e0000001-0000-0000-0000-000000000012',
   'c0000001-0000-0000-0000-000000000001',
   'קימה לעמידה עם תמיכה', 'Pulling to Stand',
   'Prepares leg muscles and balance for walking. Babies naturally pull up on furniture — channel this instinct safely.',
   '1. Hold both hands and pull baby gently from sitting to standing. 2. Let them bear weight and bounce. 3. Let them use a sturdy low couch or activity table to pull themselves up. 4. Cruise along furniture for balance practice.',
   'toddler', 7, 12,
   'baby pulling to stand 8 months walking preparation',
   5, 4, 'day', 'easy', ARRAY['motor','standing','legs','strength'], 12),

  -- ── Gross Motor: 12–24 months ──────────────────────────────
  ('e0000001-0000-0000-0000-000000000020',
   'c0000001-0000-0000-0000-000000000001',
   'תרגול הליכה', 'Walking Practice',
   'Supports the transition from cruising to independent walking. Focus on confidence and balance over speed.',
   '1. Walk behind child with minimal support at hips — not hands (changes gait). 2. Practice on different surfaces: carpet, grass, sand. 3. Push toys and ride-on toys build walking confidence. 4. Shoes at home are optional — bare feet give better proprioceptive feedback.',
   'toddler', 10, 16,
   'toddler walking practice balance 12 months',
   15, 3, 'day', 'easy', ARRAY['motor','walking','balance'], 20),

  ('e0000001-0000-0000-0000-000000000021',
   'c0000001-0000-0000-0000-000000000001',
   'גלגול וזריקת כדור', 'Ball Play',
   'Ball play develops hand-eye coordination, bilateral coordination, and social turn-taking. One of the best all-round gross motor activities.',
   '1. Sit facing child with legs apart. Roll a large ball back and forth. 2. Progress to tossing underhand from close range. 3. Practice kicking a stationary ball.',
   'toddler', 12, 24,
   'ball activities toddler 12-18 months coordination',
   10, 2, 'day', 'easy', ARRAY['motor','coordination','ball','play'], 21),

  ('e0000001-0000-0000-0000-000000000022',
   'c0000001-0000-0000-0000-000000000001',
   'טיפוס מדרגות', 'Stair Climbing',
   'Builds leg strength, coordination, and spatial awareness. An important functional milestone for safety and independence.',
   '1. Hold handrail or adult''s hand. 2. Encourage one step at a time, leading with same foot. 3. Count stairs together. 4. Progress from crawling up/down to walking with support.',
   'toddler', 12, 24,
   'toddler stair climbing exercises safe 12 months',
   10, 1, 'day', 'easy', ARRAY['motor','stairs','legs','strength'], 22),

  -- ── Gross Motor: 18–36 months ──────────────────────────────
  ('e0000001-0000-0000-0000-000000000030',
   'c0000001-0000-0000-0000-000000000001',
   'קפיצות וזינוקים', 'Jumping & Hopping',
   'Jumping develops bilateral coordination, leg power, and body awareness. A key milestone between 18–30 months.',
   '1. Start by jumping down from a small step with hand-holding. 2. Progress to jumping in place with both feet together. 3. Jump over a line on the floor. 4. Try hopping on one foot (typically 30+ months).',
   'toddler', 18, 36,
   'jumping exercises toddler 2-3 years bilateral coordination',
   10, 2, 'day', 'easy', ARRAY['motor','jumping','coordination','strength'], 30),

  ('e0000001-0000-0000-0000-000000000031',
   'c0000001-0000-0000-0000-000000000001',
   'עמידה על רגל אחת', 'Single-Leg Balance',
   'Develops balance, proprioception, and coordination. Predicts future athletic skill and fall prevention.',
   '1. Stand near a wall for safety. 2. Lift one foot and count seconds. 3. Progress to longer holds. 4. Make it a flamingo game — who can hold longest?',
   'toddler', 24, 36,
   'balance exercises toddler one leg stand 2-3 years',
   5, 3, 'day', 'easy', ARRAY['motor','balance','proprioception'], 31),

  ('e0000001-0000-0000-0000-000000000032',
   'c0000001-0000-0000-0000-000000000001',
   'ריצה ועצירה', 'Running & Stopping',
   'Develops running mechanics, braking control, and spatial awareness — important for playground safety.',
   '1. Play stop-and-go: "אדום! ירוק!" 2. Run to different colored objects. 3. Set up a simple obstacle course. 4. Race to a target and back.',
   'toddler', 18, 36,
   'running games toddler 2-3 years motor development',
   15, 2, 'day', 'easy', ARRAY['motor','running','coordination'], 32),

  -- ── Fine Motor ─────────────────────────────────────────────
  ('e0000001-0000-0000-0000-000000000040',
   'c0000001-0000-0000-0000-000000000002',
   'אחיזה ושחרור', 'Grasping & Releasing',
   'Develops palmar grasp progressing to pincer grasp. Essential foundation for all future fine motor skills.',
   '1. Offer rattles, rings, and soft toys to grasp. 2. Put objects into a container and take them out. 3. Offer soft finger foods for pincer practice (from ~9 months). 4. Use large pegboard puzzles.',
   'toddler', 3, 12,
   'baby grasping fine motor 6 months pincer grasp',
   10, 3, 'day', 'easy', ARRAY['fine motor','grasping','hands'], 40),

  ('e0000001-0000-0000-0000-000000000041',
   'c0000001-0000-0000-0000-000000000002',
   'בניית מגדל מקוביות', 'Block Stacking',
   'Develops eye-hand coordination, spatial reasoning, and bilateral coordination. Classic toddler milestone.',
   '1. Start with 2 large blocks. 2. Demonstrate and let child copy. 3. Count together as you stack. 4. Progress to more blocks and celebrate towers.',
   'toddler', 12, 36,
   'block stacking activities toddler fine motor spatial',
   10, 2, 'day', 'easy', ARRAY['fine motor','coordination','blocks','spatial'], 41),

  ('e0000001-0000-0000-0000-000000000042',
   'c0000001-0000-0000-0000-000000000002',
   'ציור וצביעה', 'Drawing & Coloring',
   'Develops pencil grip, hand strength, and pre-writing skills. All marks are valid — the process matters, not the product.',
   '1. Start with chunky crayons. 2. Encourage scribbling — all marks are great! 3. Introduce finger-painting for sensory experience. 4. Later name colors and describe shapes drawn.',
   'toddler', 12, 36,
   'drawing coloring activities toddler 1-3 years fine motor',
   15, 3, 'week', 'easy', ARRAY['fine motor','drawing','pre-writing','creativity'], 42),

  ('e0000001-0000-0000-0000-000000000043',
   'c0000001-0000-0000-0000-000000000002',
   'פאזלים ומיון', 'Puzzles & Sorting',
   'Develops problem-solving, fine motor control, and spatial reasoning. Begin with simple shapes and progress.',
   '1. Shape sorters first. 2. Progress to 2–3 piece knob puzzles. 3. Sort objects by color, then shape, then size. 4. Matching games with picture cards.',
   'toddler', 12, 36,
   'puzzle sorting toddler fine motor 18 months cognitive',
   10, 3, 'week', 'easy', ARRAY['fine motor','puzzle','cognitive','sorting'], 43),

  -- ── Sensory ────────────────────────────────────────────────
  ('e0000001-0000-0000-0000-000000000050',
   'c0000001-0000-0000-0000-000000000003',
   'עיסוי תינוק', 'Baby Massage',
   'Baby massage promotes bonding, body awareness, and sensory processing. Research shows benefits for sleep and digestion.',
   '1. Use baby-safe oil or lotion. 2. Start with legs and feet, then belly, arms, and back. 3. Use gentle strokes. 4. Watch baby''s cues — stop if uncomfortable. 5. Best after bath, not when hungry.',
   'toddler', 0, 12,
   'baby massage techniques tutorial newborn benefits',
   15, 1, 'day', 'easy', ARRAY['sensory','touch','bonding','massage'], 50),

  ('e0000001-0000-0000-0000-000000000051',
   'c0000001-0000-0000-0000-000000000003',
   'משחק חושי', 'Sensory Play',
   'Sensory play builds neural connections and supports learning through exploration. Crucial for brain development from 6 months onward.',
   '1. Sensory bins with rice, pasta, sand, or water. 2. Playdough (easy homemade recipe: 2 cups flour, 1/2 cup salt, water + food color). 3. Finger painting. 4. Water play in shallow basin. Always supervise.',
   'toddler', 6, 36,
   'sensory play ideas toddler 1-2 years DIY',
   20, 3, 'week', 'easy', ARRAY['sensory','texture','exploration','play'], 51),

  ('e0000001-0000-0000-0000-000000000052',
   'c0000001-0000-0000-0000-000000000003',
   'מוזיקה ותנועה', 'Music & Movement',
   'Rhythm and movement activities support auditory processing, motor coordination, and language development.',
   '1. Sing nursery rhymes with actions. 2. Use simple instruments — shakers, drums, pots. 3. Dance together. 4. Play freeze dance. 5. Clap and stomp to rhythms.',
   'toddler', 0, 36,
   'music movement activities baby toddler development songs',
   15, 3, 'week', 'easy', ARRAY['sensory','music','rhythm','language'], 52),

  -- ── Language ───────────────────────────────────────────────
  ('e0000001-0000-0000-0000-000000000060',
   'c0000001-0000-0000-0000-000000000004',
   'שירה ושיחה', 'Singing & Talking',
   'Quantity and quality of language input from birth directly predicts later vocabulary. Narrating daily life is one of the highest-impact activities parents can do.',
   '1. Narrate everything: "עכשיו שמים חולצה". 2. Sing simple repetitive songs. 3. Respond to babbling as if it''s conversation (serve-and-return). 4. Read books aloud from birth — point at pictures.',
   'toddler', 0, 36,
   'talking to baby language development strategies serve and return',
   15, 5, 'day', 'easy', ARRAY['language','speech','songs','communication'], 60),

  ('e0000001-0000-0000-0000-000000000061',
   'c0000001-0000-0000-0000-000000000004',
   'קריאת ספרים יחד', 'Shared Book Reading',
   'Shared book reading is the single most evidence-backed activity for language and literacy development, even for very young babies.',
   '1. Board books (0–12m): focus on pictures and sounds. 2. Simple story books for toddlers. 3. Point and name objects. 4. Let child turn pages. 5. Re-read favourites — repetition is the point.',
   'toddler', 0, 36,
   'reading books babies toddlers language development best books',
   15, 1, 'day', 'easy', ARRAY['language','literacy','reading','books'], 61),

  ('e0000001-0000-0000-0000-000000000062',
   'c0000001-0000-0000-0000-000000000004',
   'הרחבת אוצר מילים', 'Vocabulary Building',
   'Active vocabulary-building games help toddlers expand from single words to phrases and sentences.',
   '1. Label everything: "זה כיסא, זה שולחן". 2. Describe actions as they happen: "קופץ! רץ! אוכל!" 3. After child says one word, model two: "כלב!" → "כן, כלב גדול!" 4. Ask open questions: "מה זה?"',
   'toddler', 12, 36,
   'vocabulary activities toddler 18 months word explosion',
   10, 3, 'day', 'easy', ARRAY['language','vocabulary','words','speech'], 62),

  -- ── Social-Cognitive ───────────────────────────────────────
  ('e0000001-0000-0000-0000-000000000070',
   'c0000001-0000-0000-0000-000000000005',
   'קוקו וקבע אובייקט', 'Peekaboo & Object Permanence',
   'Peekaboo teaches object permanence — understanding things exist even when hidden. A crucial cognitive milestone developing from 4–12 months.',
   '1. Hide face behind hands and reveal. 2. Hide a toy under a cloth and let baby find it. 3. Play peek from behind furniture. 4. Pop-up toys.',
   'toddler', 4, 18,
   'peekaboo games baby object permanence 6 months',
   10, 3, 'day', 'easy', ARRAY['cognitive','social','object permanence','games'], 70),

  ('e0000001-0000-0000-0000-000000000071',
   'c0000001-0000-0000-0000-000000000005',
   'משחק דמיון', 'Pretend Play',
   'Pretend play develops creativity, language, social understanding, and problem-solving. Explodes around 18–24 months.',
   '1. Introduce toy kitchen, doctor kit, dolls. 2. Model pretend scenarios: "הבובה רעבה". 3. Join the play and extend it. 4. Let child lead.',
   'toddler', 18, 36,
   'pretend play activities toddler 18-24 months imagination',
   20, 3, 'week', 'easy', ARRAY['cognitive','pretend','creativity','social','language'], 71),

  ('e0000001-0000-0000-0000-000000000072',
   'c0000001-0000-0000-0000-000000000005',
   'שגרת לפני שינה', 'Bedtime Routine',
   'Consistent bedtime routines support sleep, emotional regulation, and parent-child bonding. One of the highest-impact daily habits.',
   '1. Keep consistent: bath → pajamas → book → song → sleep. 2. Same sequence every night. 3. Keep calm and predictable. 4. Dim lights in the evening from about 6 months.',
   'toddler', 0, 36,
   'bedtime routine toddler sleep training 1-3 years',
   30, 1, 'day', 'easy', ARRAY['routine','sleep','emotional regulation','bonding'], 72)

ON CONFLICT (id) DO NOTHING;

-- ── ADULT PHYSIOTHERAPY EXERCISES ───────────────────────────

INSERT INTO exercise_library
  (id, category_id, name, name_en, description, instructions, target, body_area,
   youtube_search_query, suggested_duration_minutes,
   suggested_frequency_count, suggested_frequency_per, difficulty, tags, sort_order)
VALUES

  -- ── NECK ────────────────────────────────────────────────────

  ('e0000002-0000-0000-0000-000000000001',
   'c0000001-0000-0000-0000-000000000010',
   'נסיגת סנטר', 'Chin Tuck (Cervical Retraction)',
   'The chin tuck is the most evidence-based exercise for neck pain and cervicogenic headaches. It corrects forward head posture by activating the deep cervical flexors.',
   '1. Sit or stand with good posture. 2. Pull chin straight back — making a "double chin". Do NOT tilt head up or down. 3. Hold 5 seconds. 4. Release and repeat. Feel a gentle stretch at the base of the skull.',
   'adult', 'neck',
   'chin tuck cervical retraction forward head posture exercise',
   5, 10, 'day', 'easy', ARRAY['neck','posture','forward head','headache'], 1),

  ('e0000002-0000-0000-0000-000000000002',
   'c0000001-0000-0000-0000-000000000010',
   'מתיחת טרפז עליון', 'Upper Trapezius Stretch',
   'Releases the most commonly tight muscle in desk workers. Highly effective for neck pain and tension headaches.',
   '1. Sit upright. 2. Tilt right ear toward right shoulder — do NOT lift the shoulder. 3. Place right hand on top of head and apply gentle downward pressure. Do not force. 4. Hold 30 seconds. 5. Switch sides.',
   'adult', 'neck',
   'upper trapezius stretch neck pain desk workers tension',
   5, 3, 'day', 'easy', ARRAY['neck','trapezius','stretch','desk','headache'], 2),

  ('e0000002-0000-0000-0000-000000000003',
   'c0000001-0000-0000-0000-000000000010',
   'מתיחת מרים השכמה', 'Levator Scapulae Stretch',
   'Targets the muscle that runs from shoulder blade to upper cervical spine — a common cause of "stiff neck".',
   '1. Sit upright. 2. Rotate head 45° to the right. 3. Tilt chin down toward right armpit. 4. Place right hand on back of head; apply gentle pressure. 5. Hold 30 seconds. 6. Switch sides.',
   'adult', 'neck',
   'levator scapulae stretch stiff neck relief physiotherapy',
   5, 3, 'day', 'easy', ARRAY['neck','levator scapulae','stiff neck','stretch'], 3),

  ('e0000002-0000-0000-0000-000000000004',
   'c0000001-0000-0000-0000-000000000010',
   'סיבוב צוואר', 'Cervical Rotation',
   'Maintains and improves cervical range of motion. Gentle, controlled movement prevents stiffness from worsening.',
   '1. Sit with neutral spine. 2. Slowly rotate head to look over right shoulder as far as comfortable — no pain. 3. Hold 2 seconds. 4. Return to centre. 5. Repeat to left. Keep movement smooth.',
   'adult', 'neck',
   'neck rotation exercises range of motion stiffness relief',
   5, 10, 'day', 'easy', ARRAY['neck','rotation','range of motion','mobility'], 4),

  ('e0000002-0000-0000-0000-000000000005',
   'c0000001-0000-0000-0000-000000000010',
   'חיזוק איזומטרי צוואר', 'Isometric Neck Strengthening',
   'Safe strengthening even during acute neck pain — muscles work hard with no movement and no joint stress.',
   '1. Palm on forehead: push head forward into hand — no movement. Hold 5 sec. 2. Palm on back of head: push backward. 3. Palm on right side: push right. 4. Palm on left: push left. Each direction × 10.',
   'adult', 'neck',
   'isometric neck strengthening exercises safe cervical',
   5, 10, 'day', 'easy', ARRAY['neck','strengthening','isometric','cervical'], 5),

  ('e0000002-0000-0000-0000-000000000006',
   'c0000001-0000-0000-0000-000000000010',
   'גלגול כתפיים', 'Shoulder Rolls',
   'Releases tension in upper trapezius and shoulder girdle. Simple office-friendly exercise.',
   '1. Sit upright, arms relaxed. 2. Roll shoulders backward in large circles × 10. 3. Then forward × 10. 4. Squeeze shoulder blades together at back of movement.',
   'adult', 'neck',
   'shoulder rolls upper trapezius tension relief office',
   3, 10, 'day', 'easy', ARRAY['neck','shoulders','trapezius','desk','mobility'], 6),

  ('e0000002-0000-0000-0000-000000000007',
   'c0000001-0000-0000-0000-000000000010',
   'הארכת בית חזה', 'Thoracic Extension',
   'Mid-back stiffness is a major driver of neck pain. Opening the thoracic spine reduces strain on the cervical spine.',
   '1. Roll a towel to ~8 cm diameter. 2. Lie on back, place towel horizontally under mid-back (NOT lower back). 3. Arms at sides or clasped behind head. 4. Let gravity open the chest. 5. Hold 60 seconds, then move towel slightly higher and repeat.',
   'adult', 'neck',
   'thoracic extension foam roll upper back mobility neck pain',
   10, 1, 'day', 'easy', ARRAY['neck','thoracic','posture','mobility','upper back'], 7),

  ('e0000002-0000-0000-0000-000000000008',
   'c0000001-0000-0000-0000-000000000010',
   'מתיחת צוואר לצד', 'Lateral Neck Flexion Stretch',
   'Stretches the scalene and SCM muscles. Helpful for tension headaches and cervical stiffness.',
   '1. Sit upright. 2. Tilt right ear toward right shoulder — do NOT rotate. 3. Add gentle hand pressure if needed. 4. Hold 30 seconds. 5. Switch sides.',
   'adult', 'neck',
   'lateral neck stretch scalene SCM tight neck muscles',
   5, 3, 'day', 'easy', ARRAY['neck','stretch','scalene','lateral','flexibility'], 8),

  -- ── PELVIC FLOOR ────────────────────────────────────────────

  ('e0000002-0000-0000-0000-000000000020',
   'c0000001-0000-0000-0000-000000000011',
   'תרגילי קגל', 'Kegel Exercises',
   'Kegel exercises strengthen the pelvic floor. Essential for urinary incontinence, post-partum recovery, and pelvic organ prolapse prevention. Equally beneficial for men and women.',
   '1. Identify the muscles: imagine stopping urination mid-stream. Do NOT practise while actually urinating. 2. Contract those muscles for 5–10 seconds. 3. Fully relax for equal time — relaxation is as important as contraction. 4. × 10 reps.',
   'adult', 'pelvic_floor',
   'kegel exercises pelvic floor how to correctly physiotherapy',
   5, 10, 'day', 'easy', ARRAY['pelvic floor','kegel','strengthening','incontinence','postpartum'], 20),

  ('e0000002-0000-0000-0000-000000000021',
   'c0000001-0000-0000-0000-000000000011',
   'הרפיית רצפת האגן', 'Pelvic Floor Relaxation (Reverse Kegel)',
   'Hypertonic (too-tight) pelvic floor causes pain, urgency, and dyspareunia. Learning to release is as important as strengthening.',
   '1. Lie comfortably on back, knees bent. 2. Take a deep breath into your belly. 3. As you inhale, consciously let the pelvic floor drop and open — imagine a flower opening. 4. Hold relaxation 5 sec. 5. Exhale gently.',
   'adult', 'pelvic_floor',
   'reverse kegel pelvic floor relaxation hypertonic tight',
   5, 5, 'day', 'easy', ARRAY['pelvic floor','relaxation','reverse kegel','hypertonic','tension'], 21),

  ('e0000002-0000-0000-0000-000000000022',
   'c0000001-0000-0000-0000-000000000011',
   'נשימה סרעפתית עם רצפת אגן', 'Diaphragmatic Breathing with Pelvic Floor',
   'The diaphragm and pelvic floor move together on every breath. This coordination is fundamental to core and pelvic function.',
   '1. Lie on back, hands on belly. 2. Inhale slowly through nose — belly rises, pelvic floor drops and relaxes. 3. Exhale slowly through mouth — belly falls, pelvic floor gently lifts. 4. Keep movement natural. × 10 breaths.',
   'adult', 'pelvic_floor',
   'diaphragmatic breathing pelvic floor coordination core',
   5, 10, 'day', 'easy', ARRAY['pelvic floor','breathing','diaphragm','core','relaxation'], 22),

  ('e0000002-0000-0000-0000-000000000023',
   'c0000001-0000-0000-0000-000000000011',
   'גשר - ישבן ורצפת אגן', 'Glute Bridge',
   'Strengthens glutes, hamstrings, and pelvic floor simultaneously. A cornerstone of pelvic floor rehabilitation.',
   '1. Lie on back, knees bent, feet flat, hip-width apart. 2. Engage pelvic floor. 3. Exhale and lift hips until thighs and torso form a straight line. 4. Hold 5 sec at top. 5. Lower slowly on inhale.',
   'adult', 'pelvic_floor',
   'glute bridge pelvic floor postpartum rehabilitation',
   10, 10, 'day', 'easy', ARRAY['pelvic floor','glutes','bridge','core','postpartum'], 23),

  ('e0000002-0000-0000-0000-000000000024',
   'c0000001-0000-0000-0000-000000000011',
   'הטיית אגן', 'Pelvic Tilt',
   'Improves lumbopelvic coordination and awareness, and activates deep core muscles.',
   '1. Lie on back, knees bent. 2. Gently flatten lower back against the floor by pulling belly in and tilting pelvis. 3. Hold 5 sec. 4. Release. Also try standing with back against wall.',
   'adult', 'pelvic_floor',
   'pelvic tilt exercise lower back pain core activation',
   5, 15, 'day', 'easy', ARRAY['pelvic floor','pelvic tilt','lower back','core'], 24),

  ('e0000002-0000-0000-0000-000000000025',
   'c0000001-0000-0000-0000-000000000011',
   'חיפושית מתה - ליבה עם רצפת אגן', 'Dead Bug — Core & Pelvic Floor',
   'One of the safest and most effective core exercises. Protects the spine while challenging deep abdominals and the pelvic floor.',
   '1. Lie on back, arms to ceiling, knees and hips at 90° (table-top). 2. Engage pelvic floor, flatten lower back. 3. Inhale. 4. Exhale — slowly lower right arm and left leg toward floor. 5. Inhale — return. 6. Switch sides. Keep lower back on floor throughout.',
   'adult', 'pelvic_floor',
   'dead bug exercise core pelvic floor lower back safe',
   10, 8, 'day', 'medium', ARRAY['pelvic floor','core','dead bug','abdominals','spine'], 25),

  ('e0000002-0000-0000-0000-000000000026',
   'c0000001-0000-0000-0000-000000000011',
   'כריעה עם הפעלת רצפת אגן', 'Squat with Pelvic Floor',
   'Teaches pelvic floor coordination during functional loading — prevents leakage with activity and sport.',
   '1. Stand feet shoulder-width, toes slightly out. 2. Inhale and relax pelvic floor as you lower. 3. At the bottom, maintain relaxation. 4. Exhale and engage pelvic floor as you rise. Think "lift before you lift".',
   'adult', 'pelvic_floor',
   'squat pelvic floor coordination incontinence functional',
   10, 10, 'day', 'medium', ARRAY['pelvic floor','squat','functional','incontinence','strength'], 26),

  ('e0000002-0000-0000-0000-000000000027',
   'c0000001-0000-0000-0000-000000000011',
   'מתיחת כופף הירך', 'Hip Flexor Stretch',
   'Tight hip flexors tilt the pelvis anteriorly, increasing pelvic floor tension. Releasing them is often part of pelvic floor treatment.',
   '1. Kneel on right knee (pad underneath). Left foot forward. 2. Keep torso upright. 3. Push hips gently forward until stretch felt at front of right hip. 4. Hold 30 sec. 5. Switch sides.',
   'adult', 'pelvic_floor',
   'hip flexor stretch pelvic floor kneeling lunge',
   5, 3, 'day', 'easy', ARRAY['pelvic floor','hip flexor','stretch','pelvis','posture'], 27),

  -- ── BACK ────────────────────────────────────────────────────

  ('e0000002-0000-0000-0000-000000000040',
   'c0000001-0000-0000-0000-000000000012',
   'חתול-פרה', 'Cat-Cow',
   'Gentle spinal mobilisation that lubricates vertebral joints, stretches paraspinals, and is safe for almost all types of back pain. Ideal as a morning warm-up.',
   '1. All fours, wrists under shoulders, knees under hips. 2. COW: inhale, let belly drop, lift head and tailbone. 3. CAT: exhale, round spine to ceiling, tuck chin and pelvis. 4. Flow between them with breath × 10.',
   'adult', 'back',
   'cat cow stretch back pain yoga morning routine',
   5, 10, 'day', 'easy', ARRAY['back','spine','mobility','stretch','morning'], 40),

  ('e0000002-0000-0000-0000-000000000041',
   'c0000001-0000-0000-0000-000000000012',
   'תנוחת ילד', 'Child''s Pose',
   'Gently decompresses the lumbar spine and stretches the lower back extensors. Particularly helpful for disc-related pain.',
   '1. Kneel and sit back on heels. 2. Reach arms forward on the floor or rest alongside body. 3. Forehead on floor. 4. Breathe deeply — feel lower back expand. 5. Hold 30–60 seconds.',
   'adult', 'back',
   'child pose lower back pain relief decompression yoga',
   5, 3, 'day', 'easy', ARRAY['back','lower back','decompression','stretch','relaxation'], 41),

  ('e0000002-0000-0000-0000-000000000042',
   'c0000001-0000-0000-0000-000000000012',
   'ציפור-כלב', 'Bird-Dog',
   'Gold standard for lumbar stabilisation. Strengthens multifidus and transversus abdominis while maintaining neutral spine.',
   '1. All fours, neutral spine. 2. Engage core. 3. Extend right arm forward and left leg back — level with body. 4. Hold 3–5 seconds, no pelvic rotation. 5. Return and switch sides.',
   'adult', 'back',
   'bird dog exercise lumbar stabilization lower back strengthening',
   10, 8, 'day', 'medium', ARRAY['back','core','lumbar','stabilisation','strengthening'], 42),

  ('e0000002-0000-0000-0000-000000000043',
   'c0000001-0000-0000-0000-000000000012',
   'ברכיים לחזה', 'Knee-to-Chest Stretch',
   'Stretches lower back muscles and hip extensors. Provides relief from lumbar compression and muscle tightness.',
   '1. Lie on back, knees bent. 2. Pull one knee toward chest with both hands. 3. Hold 30 sec. 4. Switch. 5. For double stretch: pull both knees simultaneously.',
   'adult', 'back',
   'knee to chest stretch lower back pain tight muscles',
   5, 3, 'day', 'easy', ARRAY['back','lower back','stretch','hip','flexibility'], 43),

  ('e0000002-0000-0000-0000-000000000044',
   'c0000001-0000-0000-0000-000000000012',
   'מתיחת סיבוב מותני', 'Lumbar Rotation Stretch',
   'Releases paravertebral tension, mobilises lumbar facet joints, and stretches the piriformis.',
   '1. Lie on back, knees bent, feet flat. 2. Keep shoulders FLAT on floor. 3. Slowly drop both knees to one side. 4. Hold 30–60 seconds. 5. Return to centre and drop to other side.',
   'adult', 'back',
   'lumbar rotation stretch lower back stiffness relief',
   5, 3, 'day', 'easy', ARRAY['back','rotation','stretch','lumbar','piriformis'], 44),

  ('e0000002-0000-0000-0000-000000000045',
   'c0000001-0000-0000-0000-000000000012',
   'לחיצת מקנזי', 'McKenzie Press-Up',
   'Evidence-based for lumbar disc-related back pain. Helps centralise referred leg pain and restore extension range. Best used when symptoms travel down the leg.',
   '1. Lie face down, hands under shoulders. 2. Slowly press up, letting hips sag toward floor. 3. Keep hips relaxed — do NOT squeeze glutes. 4. Rise to comfortable range only. 5. Lower slowly. STOP if symptoms travel further down leg.',
   'adult', 'back',
   'McKenzie press up extension exercise lumbar disc back pain',
   5, 10, 'day', 'medium', ARRAY['back','McKenzie','disc','extension','lumbar'], 45),

  ('e0000002-0000-0000-0000-000000000046',
   'c0000001-0000-0000-0000-000000000012',
   'מתיחת פיריפורמיס (מתיחת 4)', 'Piriformis Stretch (Figure-4)',
   'The piriformis can irritate the sciatic nerve when tight, producing sciatica-like symptoms. One of the most effective stretches to address it.',
   '1. Lie on back, knees bent. 2. Cross right ankle over left knee. 3. Flex right foot. 4. Pull left thigh toward chest — feel deep stretch in right glute. 5. Hold 30–60 sec. 6. Switch sides.',
   'adult', 'back',
   'piriformis stretch figure 4 sciatica glute pain',
   5, 3, 'day', 'easy', ARRAY['back','piriformis','sciatica','glute','stretch'], 46),

  ('e0000002-0000-0000-0000-000000000047',
   'c0000001-0000-0000-0000-000000000012',
   'סופרמן - חיזוק שרירי גב', 'Superman Back Extension',
   'Strengthens the posterior chain (erectors, glutes, hamstrings) to support the lumbar spine and prevent recurrence.',
   '1. Lie face down, arms extended overhead. 2. Simultaneously lift right arm and left leg a few cm off floor. 3. Hold 2–3 sec. 4. Lower. 5. Switch sides. Progress to lifting both arms and legs together.',
   'adult', 'back',
   'superman back extension lower back strengthening erector spinae',
   5, 10, 'day', 'easy', ARRAY['back','strengthening','extension','erector spinae','posterior chain'], 47),

  -- ── KNEE ────────────────────────────────────────────────────

  ('e0000002-0000-0000-0000-000000000060',
   'c0000001-0000-0000-0000-000000000013',
   'כיווץ ארבע ראשי', 'Quad Sets',
   'The safest starting exercise after knee surgery or during acute pain. Activates the quad without any joint loading.',
   '1. Sit or lie with leg straight on flat surface. 2. Tighten thigh muscle by pressing back of knee toward floor. 3. Hold contraction 5 seconds. 4. Release fully. Feel the quad — not just the kneecap — engage.',
   'adult', 'knee',
   'quad sets exercise knee rehabilitation post surgery',
   5, 15, 'day', 'easy', ARRAY['knee','quad','strengthening','rehabilitation','VMO'], 60),

  ('e0000002-0000-0000-0000-000000000061',
   'c0000001-0000-0000-0000-000000000013',
   'הרמת רגל ישרה', 'Straight Leg Raise (SLR)',
   'Strengthens quads and hip flexors without bending the knee — essential after ACL surgery or with significant pain.',
   '1. Lie on back. Bend uninvolved knee, foot flat. 2. Tighten quad on straight leg. 3. Raise straight leg to height of opposite knee (~45°). 4. Hold 2 sec. 5. Lower slowly.',
   'adult', 'knee',
   'straight leg raise SLR knee ACL rehabilitation',
   10, 15, 'day', 'easy', ARRAY['knee','quad','SLR','ACL','strengthening'], 61),

  ('e0000002-0000-0000-0000-000000000062',
   'c0000001-0000-0000-0000-000000000013',
   'מתיחת גידי האחור', 'Hamstring Stretch',
   'Tight hamstrings increase knee load. Regular stretching reduces pain, improves gait, and prevents injury.',
   '1. Lie on back. 2. Hold one thigh with both hands behind knee. 3. Slowly straighten leg until stretch felt in back of thigh — NOT behind the knee. 4. Hold 30 sec. 5. Switch. Can use towel or strap around foot.',
   'adult', 'knee',
   'hamstring stretch knee pain lying down physiotherapy',
   5, 3, 'day', 'easy', ARRAY['knee','hamstring','stretch','flexibility','posterior'], 62),

  ('e0000002-0000-0000-0000-000000000063',
   'c0000001-0000-0000-0000-000000000013',
   'ישיבה מול קיר', 'Wall Squat (Wall Sit)',
   'Builds quad endurance in a controlled, supported position. Safe for most knee conditions.',
   '1. Back flat against wall, feet ~60 cm from wall. 2. Slide down until knee angle comfortable (30–60°, NOT past 90°). 3. Hold 30–60 sec. 4. Keep weight on heels. 5. Knees should track over 2nd toe.',
   'adult', 'knee',
   'wall squat wall sit knee strengthening endurance',
   5, 3, 'day', 'medium', ARRAY['knee','quad','wall squat','endurance','functional'], 63),

  ('e0000002-0000-0000-0000-000000000064',
   'c0000001-0000-0000-0000-000000000013',
   'עלייה על מדרך', 'Step-Ups',
   'Simulates stair climbing and builds quad strength, balance, and stair confidence.',
   '1. Stand in front of a step (15–20 cm). 2. Place affected leg on step. 3. Drive through heel to step up, bring other foot up. 4. Control the descent slowly — this eccentric phase is where most benefit occurs.',
   'adult', 'knee',
   'step up exercise knee rehabilitation stairs functional',
   10, 10, 'day', 'medium', ARRAY['knee','quad','step up','functional','eccentric','stairs'], 64),

  ('e0000002-0000-0000-0000-000000000065',
   'c0000001-0000-0000-0000-000000000013',
   'עלייה על קצות האצבעות', 'Calf Raises',
   'Strengthens the calf muscles which absorb knee forces during walking. Important for knee OA and patellofemoral syndrome management.',
   '1. Stand on edge of step (optional — for full range). 2. Rise slowly onto toes. 3. Hold 2 sec at top. 4. Lower slowly — feel gentle stretch at bottom. 5. Start double-leg, progress to single-leg.',
   'adult', 'knee',
   'calf raises knee pain gastrocnemius strengthening',
   5, 15, 'day', 'easy', ARRAY['knee','calf','gastrocnemius','strengthening','OA'], 65),

  ('e0000002-0000-0000-0000-000000000066',
   'c0000001-0000-0000-0000-000000000013',
   'פתיחת צדפה - אבדוקטורים', 'Clamshell',
   'Strengthens hip abductors (gluteus medius), crucial for knee alignment. Weak abductors are a common cause of patellofemoral pain.',
   '1. Side lying, knees bent at 45°, feet together, hips stacked. 2. Keeping feet together, rotate top knee toward ceiling like a clamshell. 3. Stop when pelvis wants to roll back. 4. Hold 2 sec. 5. Lower slowly.',
   'adult', 'knee',
   'clamshell exercise hip abductor knee alignment patellofemoral',
   10, 15, 'day', 'easy', ARRAY['knee','hip abductor','glute med','clamshell','alignment','patellofemoral'], 66),

  ('e0000002-0000-0000-0000-000000000067',
   'c0000001-0000-0000-0000-000000000013',
   'הארכת ברך סופית עם גומייה', 'Terminal Knee Extension (TKE)',
   'Specifically activates the VMO (inner quad) which is typically weak in knee pain patients. Key exercise for patellofemoral syndrome and ACL rehab.',
   '1. Loop resistance band around a fixed point at knee height. 2. Step into loop, band behind knee, facing anchor. 3. Start with slight knee bend. 4. Fully straighten knee against band. 5. Hold 2 sec. 6. Return slowly.',
   'adult', 'knee',
   'terminal knee extension TKE VMO exercise resistance band',
   10, 15, 'day', 'medium', ARRAY['knee','VMO','quad','TKE','ACL','resistance band'], 67),

  ('e0000002-0000-0000-0000-000000000068',
   'c0000001-0000-0000-0000-000000000013',
   'מתיחת שריר הירך הקדמי', 'Quadriceps Stretch',
   'Reduces patellar tendon tension and relieves anterior knee pain. Balances quad strengthening exercises.',
   '1. Stand near wall for balance. 2. Bend right knee, bring heel toward glute. 3. Hold ankle — keep knees together. 4. Feel stretch along front of thigh. 5. Hold 30 sec. 6. Switch.',
   'adult', 'knee',
   'quad stretch standing anterior knee pain patellar tendon',
   5, 3, 'day', 'easy', ARRAY['knee','quad','stretch','patella','patellar tendon','flexibility'], 68)

ON CONFLICT (id) DO NOTHING;
