-- ============================================================
-- Exercise Library V4 — Baby leg & lower-body exercises (4-15m)
-- Kicking, weight-bearing, crawling prep, standing & cruising
-- Run ONCE in Supabase SQL Editor
-- ============================================================

INSERT INTO exercise_library
  (category_id, name, name_en, description, instructions, target, age_min_months, age_max_months, youtube_search_query, suggested_duration_minutes, suggested_frequency_count, suggested_frequency_per, difficulty, sort_order)
VALUES
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
   E'1. Baby on the back, knees bent, feet flat on the mat\n2. Hold the feet in place with one hand\n3. With the other hand, gently lift under the hips 2-3 cm\n4. Hold 2-3 seconds, lower slowly\n5. 5-8 lifts; older babies start pushing up themselves',
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
   E'1. From supported standing age, hold baby upright barefoot\n2. Let the feet touch: carpet, cool floor, grass, a cushion\n3. Name each feeling; watch the toes react and grip\n4. For cruisers/walkers: a little texture path on the floor\n5. 5 minutes of exploration',
   'toddler', 6, 15, 'barefoot sensory walk baby foot development', 5, 3, 'week', 'easy', 71);
