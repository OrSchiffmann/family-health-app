-- ============================================================
-- Exercise Library V3 — Infant & young toddler exercises (0-15m)
-- Rolling, tummy time, reaching, early motor milestones
-- Run ONCE in Supabase SQL Editor
-- ============================================================

INSERT INTO exercise_library
  (category_id, name, name_en, description, instructions, target, age_min_months, age_max_months, youtube_search_query, suggested_duration_minutes, suggested_frequency_count, suggested_frequency_per, difficulty, sort_order)
VALUES
  -- ── ROLLING (2-8 months) ──────────────────────────────────
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

  -- ── TUMMY TIME & CORE (0-8 months) ────────────────────────
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

  -- ── REACHING & EARLY FINE MOTOR (0-12 months) ─────────────
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

  -- ── SENSORY & BONDING (0-12 months) ───────────────────────
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

  -- ── EARLY COMMUNICATION (0-15 months) ─────────────────────
  ('c0000001-0000-0000-0000-000000000004', 'שיחות מבטים ופרצופים', 'Face Time & Serve-and-Return',
   'Face-to-face "conversations" — imitating baby''s sounds and expressions and waiting for a response — are the single best early language builder.',
   E'1. Hold baby 25-30 cm from your face\n2. When baby coos — imitate the sound back\n3. Pause and WAIT for baby''s "answer"\n4. Exaggerate expressions: surprise, smile, "ooo"\n5. A few minutes, many times a day',
   'toddler', 0, 8, 'serve and return interaction baby language', 5, 3, 'day', 'easy', 53),

  ('c0000001-0000-0000-0000-000000000004', 'שירים עם תנועות ידיים', 'Action Songs & Rhymes',
   'Songs with hand motions (clapping, waving, itsy-bitsy spider) combine language, rhythm, imitation and motor skills.',
   E'1. Pick 2-3 songs with simple motions\n2. Sing slowly, exaggerating the movements\n3. Guide baby''s hands through the motions at first\n4. Repeat the same songs daily — repetition is how they learn\n5. Watch for baby starting the motion alone!',
   'toddler', 4, 15, 'action songs for babies hand movements', 5, 2, 'day', 'easy', 54);
