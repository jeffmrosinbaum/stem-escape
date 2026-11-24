/* ===== STEM Lab Escape Challenge: station content (edit freely) =====
   Each grade plays exactly 10 stations: 7 regular + 3 with freebie: true (10 stations = 10 puzzle pieces).
   List order does not matter. The app builds 12 routes from the list: freebies are never first
   and are spread out (one early, one middle, one late).

   Station fields
     id       short unique code used in records. Don't reuse an id inside a grade.
     place    the playground spot (station title)
     text     what the kids read (or hear with the speaker button)
     type     'photo'  = take a photo with the iPad camera
              'number' = type a whole number
              'word'   = type a word
              'drag'   = drag tiles into the empty spots to finish a pattern or put things in order
     accept   (number/word) right answers. For 'number', [] means ANY whole number is accepted and
              the record shows what they typed. Fill in e.g. [4] or ['6-8'] to require a value.
              For 'word', list every word that counts; one-letter spelling slips are allowed.
     freebie  true for the 3 quick freebies
     icon     emoji on the card
     photos   (photo) how many photos are needed (default 1). Photos come only from the in-app camera.
     shapes   (photo) little shape pictures shown as helpers: 'triangle', 'trapezoid'
     observed notes from Mr. Jeff's playground photos (only shown in Teacher mode; never enforced)

   Drag stations (in STATION_SWAPS below) also have
     sequence the row kids see; null = an empty spot to fill
     answer   what goes in the empty spots, left to right
     bank     the tiles they can drag (include a few wrong ones). Tiles can be used more than once.
     replaces id of the regular station it swaps out (never a freebie)
     enabled  true = always swapped in on every iPad. false = off unless turned on in Teacher mode.
   Tile codes: 'c:blue' color dot, 's:triangle' shape (circle, square, triangle, star, heart, diamond;
   add a color like 's:star:yellow'), 'n:12' number, 't:Seed' a word.

   Mr. Jeff's 10 stations per grade below are his wording, exactly. "find" (where the spot is) is from his equipment list.
   Optional reference photo of a spot: put art/<grade>/<id>.jpg (e.g. art/1/g1-04.jpg) and it shows on that station.
   Base Camp = where the final puzzle is done. */
window.STEM_PLAYGROUNDS = {
  A: { name: '1st & 2nd grade playground', base: 'Base Camp (wooden gazebo / picnic shelter)',
       equipment: ['main colorful structures with yellow slides', 'green plastic climbing wall / bridge', 'purple spinner (merry-go-round) on the turf',
                   'red rope climbing pyramid', 'yellow A-frame swing set (with baby swing)', 'extra climbing structures, stairs, paths with wooden borders',
                   'wooden gazebo / picnic shelter = Base Camp'] },
  B: { name: '4th grade playground', base: 'Base Camp (brown metal pavilion)',
       equipment: ['blue spiral + straight slides, red spiral + straight slides', 'yellow climbing panels / walls with holds',
                   'green overhead structure with red saucer swing', 'green curved rocker / spinner with red handles',
                   'geodesic dome climber (near the basketball hoops)', 'yellow monkey bars / parallel bars', 'blue double saucer swing set',
                   'green horizontal bars, rubber safety borders', 'brown metal pavilion with benches = Base Camp'] }
};

window.STEM_CHALLENGES = {
  '1': { label: '1st Grade', playground: 'A', readAloud: true, stations: [
    { id: 'g1-01', find: 'Base Camp: the wooden gazebo / picnic shelter', freebie: true, place: 'Gazebo', icon: '🏠', type: 'photo', text: 'Stand with your group and take a photo.' },
    { id: 'g1-02', observed: 'Mr. Jeff confirmed: 3 yellow slides (Nov 24).', find: 'The main colorful structures with yellow slides', place: 'Yellow slides', icon: '🛝', type: 'number', accept: [3], text: 'Count the yellow slides. Type the number.' },
    { id: 'g1-03', find: 'Any slide on the playground', freebie: true, place: 'Any slide', icon: '👉', type: 'photo', text: 'Point to a slide and take a photo.' },
    { id: 'g1-04', observed: 'Holds on the green wall are ovals; the front fin is a tall triangle shape, so it works.', find: 'The green plastic climbing wall / bridge', place: 'Green climbing wall', icon: '🔺', type: 'photo', text: 'Find a triangle. Take a photo of it.' },
    { id: 'g1-05', find: 'The red rope climbing pyramid', place: 'Red rope pyramid', icon: '🧗', type: 'photo', text: 'Take a photo of someone climbing.' },
    { id: 'g1-06', find: 'The purple spinner on the turf', freebie: true, place: 'Spinner', icon: '✋', type: 'photo', text: 'Touch the spinner and take a photo.' },
    { id: 'g1-07', observed: 'From Mr. Jeff\'s photo 082528: 8 seats (7 black belt swings + 1 orange baby/adaptive swing). Accepts 7 or 8 (some kids skip the orange seat). PLEASE CONFIRM.', find: 'The yellow A-frame swing set', place: 'Swings', icon: '🎠', type: 'number', accept: [7, 8], text: 'Count the swings. Type the number.' },
    { id: 'g1-08', observed: 'Steps not countable from the photos.', find: 'Stairs or a ladder on a climbing structure', place: 'Stairs or ladder', icon: '🪜', type: 'number', accept: [], text: 'Count the steps. Type the number.' },
    { id: 'g1-09', find: 'The purple spinner (merry-go-round) on the turf', place: 'Purple spinner', icon: '🌀', type: 'photo', text: 'Spin with your group and take a photo.' },
    { id: 'g1-10', find: 'A path with wooden borders', place: 'Path', icon: '👣', type: 'photo', text: 'Walk a little and take a photo of your group.' }
  ]},
  '2': { label: '2nd Grade', playground: 'A', readAloud: true, stations: [
    { id: 'g2-01', observed: 'Mr. Jeff confirmed: 3 yellow slides in all (Nov 24).', find: 'The main colorful structures with yellow slides', place: 'Yellow slides', icon: '🛝', type: 'number', accept: [3], text: 'Count the straight and curved yellow slides. Add them and type the total.' },
    { id: 'g2-02', find: 'Base Camp: the wooden gazebo / picnic shelter', freebie: true, place: 'Gazebo', icon: '🏠', type: 'photo', text: 'Take a group photo under the roof.' },
    { id: 'g2-03', observed: 'CHECK: the green wall is one solid dark green in the photo; no color pattern seen.', find: 'The green plastic climbing wall / bridge', place: 'Green climbing wall', icon: '🎨', type: 'photo', text: 'Find the color pattern. Take a photo of it.' },
    { id: 'g2-04', observed: 'From the photo: about 4 main ropes run from the ground to the top of the pole (hard to see). Not enforced.', find: 'The red rope climbing pyramid', place: 'Red rope pyramid', icon: '🔺', type: 'number', accept: [], text: 'Count the big ropes going up. Type the number.' },
    { id: 'g2-05', find: 'Anywhere', freebie: true, place: 'Smiles', icon: '😁', type: 'photo', text: 'Take a photo of your group smiling.' },
    { id: 'g2-06', find: 'The yellow A-frame swing set', place: 'Swings', icon: '🎠', type: 'photo', text: 'Make a swing move and take a photo.' },
    { id: 'g2-07', observed: 'Steps not countable from the photos.', find: 'Stairs on a climbing structure', place: 'Stairs', icon: '🪜', type: 'number', accept: [], text: 'Count the steps on one set. Type the number.' },
    { id: 'g2-08', find: 'The purple spinner on the turf', freebie: true, place: 'Spinner', icon: '✋', type: 'photo', text: 'Touch the spinner and take a photo.' },
    { id: 'g2-09', observed: 'CHECK: the purple merry-go-round is flat and can\'t tilt in the photo.', find: 'The purple spinner (merry-go-round) on the turf', place: 'Spinner balance', icon: '⚖️', type: 'photo', text: 'Make the spinner as level as you can. Take a photo.' },
    { id: 'g2-10', find: 'A climbing structure with a platform', place: 'Climbing structure', icon: '🧗', type: 'photo', text: 'Take a photo from a platform.' }
  ]},
  '4': { label: '4th Grade', playground: 'B', readAloud: false, stations: [
    /* Nov 24, Mr. Jeff: the old "longer or taller?" was unclear. Both slides start at the same height; the spiral's path is longer. */
    { id: 'g4-01', find: 'The spiral slide and the straight slide next to it (same height at the top)', place: 'Slides', icon: '📏', type: 'word',
      accept: ['spiral', 'the spiral', 'spiral slide', 'the spiral slide', 'sprial', 'spirle', 'curved', 'curvy', 'twisty'],
      explain: 'Both start at the same height, but the spiral curves around and around, so its path is longer.',
      text: 'Find the spiral slide and the straight slide. They start at the same height. Which one has the longer path to slide down? Type “spiral” or “straight”.' },
    { id: 'g4-02', find: 'Base Camp: the brown metal pavilion', freebie: true, place: 'Pavilion', icon: '🏠', type: 'photo', text: 'Take a group photo under the roof.' },
    /* Nov 24: "count the holds" had no right answer (any number passed), so it is now photo proof. */
    { id: 'g4-03', find: 'The yellow climbing panels / walls with holds', place: 'Yellow climbing panel', icon: '🧗', type: 'photo',
      text: 'Two friends put both hands on holds on a yellow climbing panel so the 4 hands make the corners of a rectangle. Take a photo.' },
    { id: 'g4-04', find: 'The green curved rocker / spinner with red handles', place: 'Green rocker', icon: '⚖️', type: 'photo', text: 'Find the middle and balance. Take a photo of the balanced rocker.' },
    { id: 'g4-05', find: 'Any slide (blue or red)', freebie: true, place: 'Any slide', icon: '👉', type: 'photo', text: 'Point to a slide and take a photo.' },
    /* Nov 24, Mr. Jeff: "how many triangles on one side" can't be answered (and any number passed). Now photo proof of one triangle's 3 vertices. */
    { id: 'g4-06', find: 'The geodesic dome climber near the basketball hoops', place: 'Geodesic dome', icon: '🔺', type: 'photo', shapes: ['triangle'],
      text: 'Triangles make the dome strong. Find one triangle on the dome. Three friends each touch a different corner (vertex) of the same triangle. Take a photo.' },
    /* Nov 24, Mr. Jeff: three kids hang with only one hand. */
    { id: 'g4-07', find: 'The yellow monkey bars / parallel bars', place: 'Yellow monkey bars', icon: '🐒', type: 'photo',
      text: 'Three friends hang from the yellow monkey bars at the same time, using only ONE hand each. Take a team photo while they hang.' },
    { id: 'g4-08', find: 'The green curved rocker with red handles', freebie: true, place: 'Rocker', icon: '✋', type: 'photo', text: 'Touch the middle of the rocker and take a photo.' },
    /* Nov 24, Mr. Jeff: it is not a swing. It's a red ring seat held by 3 chains from a tall green arch; 3 chains keep it steady. */
    { id: 'g4-09', find: 'The red ring seat that hangs from 3 chains under the tall green arch', place: 'Ring seat chains', icon: '⛓️', type: 'number', accept: [12],
      observed: '3 chains hold the seat (Mr. Jeff). 4 seats x 3 chains = 12.',
      explain: 'Three chains spread out like a tripod, so the seat stays steady instead of swinging.',
      text: 'The red ring seat hangs from chains. Count the chains. If the playground had 4 of these seats, how many chains would it need? Type the number.' },
    /* Nov 24, Mr. Jeff: ovals vs triangles on the red climbing wall = 6 ovals, 8 triangles (two boxes, both enforced). */
    { id: 'g4-10', find: 'The red climbing wall', place: 'Red climbing wall', icon: '🧩', type: 'number',
      parts: [{ label: 'Ovals', accept: [6] }, { label: 'Triangles', accept: [8] }], accept: [],
      observed: '6 ovals and 8 triangles (Mr. Jeff).',
      text: 'Look at the red climbing wall. How many ovals and how many triangles do you see? Type both numbers.' }
  ]}
};

/* Swap-in stations: these replace one of Mr. Jeff's stations above (never a freebie).
   enabled: true  = swapped in on every iPad, replacing the station named in "replaces".
                    The replaced station stays above as an alternate: set enabled: false here to bring it back.
   enabled: false = spare. Teacher mode can turn spares on (or defaults off) for one iPad.
   at       where the kids go. If missing, they go to the replaced station's spot.
   ownSpot  true = use this station's own reference photo (art/<grade>/<id>.jpg) instead of the replaced station's.
   refHide  true = the reference photo shows in black and white until the pattern is solved (so it shows
            WHERE the equipment is without giving away the colors), then in color on the "puzzle piece" screen.
   Each grade keeps exactly 3 freebies and 10 stations.

   Equipment patterns below were checked in Mr. Jeff's own playground video/photos (Nov 10):
     - green & blue spiral slides (1st/2nd playground, video 20261110_082356): sections alternate green, blue, green, blue
     - stacked disc climbers on the yellow-slide structure (video 20261110_082538): discs alternate blue, pink (dusty pink/red)
     - gazebo (photo 20261110_082520 and Mr. Jeff): 7 poles (6 around the edge + 1 in the middle)
   The 4th grade playground showed no clear color/shape pattern on its equipment (solid blue slides, solid red slides,
   red poles with blue rails, yellow panels), so 4th grade has no equipment pattern station yet. */
window.STATION_SWAPS = {
  '1': [
    /* Nov 24, Mr. Jeff: the green-wall triangle (big side-view triangle) moves to 2nd grade; 1st gets a simpler green-wall task. */
    { id: 'g1-holes', enabled: true, replaces: 'g1-04', type: 'photo', place: 'Wall holes', icon: '🕳️',
      at: 'Green climbing wall', find: 'The green climbing wall with holes',
      text: 'Put your hand in a hole on the green wall. Take a photo.' },
    /* Mr. Jeff: spin 10 times, then a photo. Same safe wording as 2nd grade, shorter words. */
    { id: 'g1-turns', enabled: true, replaces: 'g1-09', type: 'photo', place: 'Spin 10 times', icon: '🔄',
      at: 'Purple spinner', find: 'The purple spinner on the turf',
      text: 'Sit down and hold on. A friend pushes slowly and counts. Go around 10 times. Wait until it stops. Take a team photo.' },
    /* Mr. Jeff: replaces "Touch the spinner" (still one of the 3 easy stations). Groups are 5-6 kids. */
    { id: 'g1-hands', enabled: true, freebie: true, replaces: 'g1-06', type: 'photo', place: '5 hands', icon: '🖐️',
      at: 'Purple spinner', find: 'The purple spinner on the turf (the purple rail on top)',
      text: 'Put 5 hands on the spinner rail at the same time. Take a photo of the hands.' },
    /* Mr. Jeff: harder Path station. Picture clue only (no photo of the path, so it isn't given away). The path itself zigzags (photo 082713). */
    { id: 'g1-zigzag', enabled: true, replaces: 'g1-10', type: 'photo', noRef: true, shapes: ['zigzag'], place: 'Big zigzag', icon: '⚡',
      at: 'Somewhere on the playground', find: 'Look all around the playground. What looks like this picture?',
      text: 'Find a big zigzag on the playground. Take a photo of it.' },
    { id: 'g1-ropes', enabled: true, replaces: 'g1-05', ownSpot: true, type: 'photo', photos: 2, shapes: ['triangle'], place: 'Rope shapes', icon: '🔺',
      at: 'Red rope pyramid', find: 'The red rope climbing pyramid (blue pole in the middle)',
      text: 'Find 2 different triangles on the climbing ropes. Take a photo of each.' },
    { id: 'd1-slide', enabled: true, replaces: 'g1-02', ownSpot: true, refHide: true, type: 'drag', place: 'Slide color pattern', icon: '🌀',
      at: 'Green and blue spiral slide', find: 'The green and blue structure: the twisty slide with green and blue parts',
      text: 'Go to the green and blue spiral slide. Look at the colors going down. Finish the pattern: green, blue, green, blue, __, __',
      sequence: ['c:green', 'c:blue', 'c:green', 'c:blue', null, null],
      answer: ['c:green', 'c:blue'], bank: ['c:green', 'c:blue', 'c:yellow', 'c:red'] },
    { id: 'g1-poles', enabled: true, replaces: 'g1-08', ownSpot: true, type: 'number', accept: [7], place: 'Gazebo poles', icon: '🏛️',
      at: 'Gazebo (Base Camp)', find: 'Base Camp: the wooden gazebo / picnic shelter',
      text: 'How many poles does the gazebo have?' },
    { id: 'd1-01', enabled: false, replaces: 'g1-10', type: 'drag', place: 'Color pattern (tablet only)', icon: '🎨',
      text: 'Finish the pattern. Drag the colors.',
      sequence: ['c:blue', 'c:green', 'c:blue', 'c:green', 'c:blue', null, null],
      answer: ['c:green', 'c:blue'], bank: ['c:blue', 'c:green', 'c:red', 'c:yellow'] }
  ],
  '2': [
    { id: 'g2-ropes', enabled: true, replaces: 'g2-03', ownSpot: true, type: 'photo', photos: 2, shapes: ['triangle', 'trapezoid'], place: 'Rope shapes', icon: '🔺',
      at: 'Red rope pyramid', find: 'The red rope climbing pyramid (blue pole in the middle)',
      text: 'Find 2 different triangles or trapezoids on the climbing ropes. Take a photo of each.' },
    { id: 'd2-slide', enabled: true, replaces: 'g2-04', ownSpot: true, refHide: true, type: 'drag', place: 'Slide color pattern', icon: '🌀',
      at: 'Green and blue spiral slide', find: 'The green and blue structure: the twisty slides with green and blue parts',
      text: 'Go to the green and blue spiral slide. Look at the colors from the top to the bottom. Drag colors to fill the four empty spots.',
      sequence: ['c:green', null, 'c:green', null, null, 'c:blue', null, 'c:blue'],
      answer: ['c:blue', 'c:blue', 'c:green', 'c:green'], bank: ['c:green', 'c:blue', 'c:yellow', 'c:purple'] },
    /* Mr. Jeff (Nov 24): x2 version, exact wording, no middle-pole hint for kids. 7 poles (incl. the middle one) x 2 = 14. */
    { id: 'g2-poles', enabled: true, replaces: 'g2-07', ownSpot: true, type: 'number', accept: [14], place: 'Gazebo poles', icon: '🏛️',
      at: 'Gazebo (Base Camp)', find: 'Base Camp: the wooden gazebo / picnic shelter', observed: '7 poles including the middle one (Mr. Jeff). 2 gazebos = 14.',
      text: 'Count the poles on the gazebo. If there were 2 gazebos, how many poles would there be?' },
    /* Moved up from 1st grade (Mr. Jeff: the big side-view triangle is better for 2nd). Replaces Swing chains (count never checked). */
    { id: 'g2-walltri', enabled: true, replaces: 'g2-06', ownSpot: true, type: 'photo', shapes: ['triangle'], place: 'Wall triangle', icon: '🔺',
      at: 'Green climbing wall', find: 'The green plastic climbing wall / bridge', observed: 'The big triangle is the wall seen from the side (Mr. Jeff).',
      text: 'Find the big triangle on the green climbing wall. Hint: look at the wall from the side. Take a photo that shows the whole triangle.' },
    /* Mr. Jeff's idea, replaces #8 "Touch the spinner" (still one of the 3 easy stations). 28 fingers = 3 kids (30 fingers, 2 tucked). */
    { id: 'g2-fingers', enabled: true, freebie: true, replaces: 'g2-08', type: 'photo', place: '28 fingers', icon: '🖐️',
      at: 'Purple spinner', find: 'The purple spinner on the turf (the purple rail on top)',
      text: 'Put exactly 28 fingers on the spinner rail at the same time. Take a photo of just your hands. Tip: each hand has 5 fingers.' },
    /* Replaces #9 "Spinner balance" (the spinner is flat and can't tilt). Mr. Jeff's "go around 10 times" idea, made safe: sit, slow push, count. */
    { id: 'g2-turns', enabled: true, replaces: 'g2-09', type: 'photo', place: 'Spinner 10 turns', icon: '🔄',
      at: 'Purple spinner', find: 'The purple spinner on the turf',
      text: 'Sit down and hold on. One friend pushes slowly, then stands still and counts. Count 10 times around. Wait until it stops. Then take a photo of your team on the spinner.' },
    /* Mr. Jeff's idea, replaces #10 "Take a photo from a platform". Photo of a teammate: taken from the ground, from far away. */
    { id: 'g2-top', enabled: true, replaces: 'g2-10', type: 'photo', place: 'Top of the climb', icon: '🧗',
      at: 'Climbing wall side', find: 'The green and blue structure: the green climbing wall side with holds',
      text: 'One friend climbs the climbing wall side to the top. Stand on the ground, back a few steps, and take a photo of your friend at the top.' },
    /* Replaces #6 "Make a swing move" with skip-counting (8 swings seen in Mr. Jeff's photo; not enforced until checked). */
    { id: 'g2-chains', enabled: false, replaces: 'g2-06', type: 'number', accept: [], suggest: 16, place: 'Swing chains', icon: '⛓️',
      at: 'Swings', find: 'The yellow A-frame swing set', observed: 'Photo 082528: 8 swings (7 belt + 1 orange). 2 chains each = 16 if the orange swing has 2. Check, then put 16 in accept.',
      text: 'Each swing hangs from 2 chains. Count the swings. How many chains are there in all? Type the number.' },
    { id: 'd2-discs', enabled: false, replaces: 'g2-01', ownSpot: true, refHide: true, type: 'drag', place: 'Disc tower pattern', icon: '🥏',
      at: 'Disc tower climbers', find: 'The yellow-slide structure: the towers of stacked blue and pink discs',
      text: 'Find a tower of stacked discs. Look at the colors from the top down. Drag colors to fill the empty spots.',
      sequence: ['c:blue', null, 'c:blue', 'c:pink', null, null],
      answer: ['c:pink', 'c:blue', 'c:pink'], bank: ['c:blue', 'c:pink', 'c:yellow', 'c:green'] },
    { id: 'd2-02', enabled: false, replaces: 'g2-10', type: 'drag', place: 'Shape pattern (tablet only)', icon: '🔺',
      text: 'Look at the shape pattern. Drag shapes to fill the four empty spots.',
      sequence: ['s:triangle:green', 's:triangle:green', 's:circle:red', 's:triangle:green', 's:triangle:green', 's:circle:red', null, null, null, null],
      answer: ['s:triangle:green', 's:triangle:green', 's:circle:red', 's:triangle:green'],
      bank: ['s:triangle:green', 's:circle:red', 's:square:blue', 's:star:yellow'] }
  ],
  '4': [
    { id: 'd4-01', enabled: false, replaces: 'g4-03', type: 'drag', place: 'Number pattern (tablet only)', icon: '🔢',
      text: 'Find the rule for this number pattern. Drag numbers to fill the next four spots.',
      sequence: ['n:3', 'n:6', 'n:9', null, null, null, null],
      answer: ['n:12', 'n:15', 'n:18', 'n:21'], bank: ['n:10', 'n:12', 'n:13', 'n:15', 'n:16', 'n:18', 'n:20', 'n:21'] },
    { id: 'd4-04', enabled: false, replaces: 'g4-09', type: 'drag', place: 'Life cycle order (tablet only)', icon: '🌱',
      text: 'Put the stages of a plant’s life cycle in order, from first to last.',
      sequence: [null, null, null, null],
      answer: ['t:Seed', 't:Sprout', 't:Young plant', 't:Flower'], bank: ['t:Flower', 't:Seed', 't:Rock', 't:Young plant', 't:Sprout'] }
  ]
};

/* ===== IDEA BANK: SUGGESTIONS (draft wording, not Mr. Jeff's), all off =====
   Same style as Mr. Jeff's slide pattern / gazebo poles / rope shapes: go to the real equipment, look, and prove it.
   Each one is based on something visible in Mr. Jeff's Nov 10 photos/videos (file named in "seen").
   "replaces" is only where it would go if turned on; turn on per iPad in Teacher mode, or set enabled: true. */
var IDEAS = {
  '1': [
    { id: 'i1-discs', replaces: 'g1-10', type: 'drag', place: 'Disc tower colors', icon: '🥏', ownSpot: true, refHide: true,
      at: 'Disc tower climbers', find: 'The yellow-slide structure: towers of stacked blue and pink discs', seen: 'video 082538',
      text: 'Go to the disc tower. Look at the colors. Finish the pattern: blue, pink, blue, pink, __, __',
      sequence: ['c:blue', 'c:pink', 'c:blue', 'c:pink', null, null], answer: ['c:blue', 'c:pink'], bank: ['c:blue', 'c:pink', 'c:green', 'c:yellow'] },
    { id: 'i1-swingtri', replaces: 'g1-04', type: 'photo', place: 'Swing set triangle', icon: '🔺', ownSpot: true, shapes: ['triangle'],
      at: 'Swings', find: 'The yellow A-frame swing set', seen: 'photo 082528 (A-frame legs)',
      text: 'Find a big triangle on the swing set. Take a photo.' },
    { id: 'i1-circle', replaces: 'g1-09', type: 'photo', place: 'Spinner circle', icon: '⭕', ownSpot: true,
      at: 'Purple spinner', find: 'The purple spinner on the turf', seen: 'photo 082507',
      text: 'Find a circle at the purple spinner. Take a photo.' },
    { id: 'i1-curvy', replaces: 'g1-10', type: 'photo', place: 'Curvy slide', icon: '〰️', ownSpot: true,
      at: 'Yellow slides', find: 'The long wavy yellow slide', seen: 'video 082538',
      text: 'Find a curvy slide. Take a photo.' },
    { id: 'i1-twolanes', replaces: 'g1-10', type: 'photo', place: 'Two-lane slide', icon: '👯', ownSpot: true,
      at: 'Yellow slides', find: 'The short yellow slide with 2 lanes', seen: 'video 082538',
      text: 'Find a slide with 2 lanes. Sit side by side. Take a photo.' }
  ],
  '2': [
    { id: 'i2-hexagon', replaces: 'g2-09', type: 'number', accept: [], suggest: 6, place: 'Gazebo floor shape', icon: '⬡', ownSpot: true,
      at: 'Gazebo (Base Camp)', find: 'Base Camp: the wooden gazebo', seen: 'photo 082520 (6-sided floor and roof)',
      text: 'Count the sides of the gazebo floor. Type the number.' },
    { id: 'i2-rooftri', replaces: 'g2-09', type: 'number', accept: [], suggest: 6, place: 'Gazebo roof', icon: '🔺', ownSpot: true,
      at: 'Gazebo (Base Camp)', find: 'Base Camp: the wooden gazebo', seen: 'photo 082520',
      text: 'The gazebo roof is made of triangles. Count them. Type the number.' },
    { id: 'i2-parallel', replaces: 'g2-10', type: 'photo', place: 'Parallel bars', icon: '🟰', ownSpot: true,
      at: 'Blue climbing bars', find: 'The wavy blue overhead climbing bars on the wood chips', seen: 'photo 082725',
      text: 'Parallel lines never touch, like train tracks. Find two parallel bars on the blue climbing bars. Take a photo.' },
    { id: 'i2-dome', replaces: 'g2-10', type: 'photo', photos: 2, shapes: ['triangle'], place: 'Dome triangles', icon: '🔺', ownSpot: true,
      at: 'Dome climber', find: 'The round dome climber near the building', seen: 'photo 082652',
      text: 'The dome is made of triangles. Find 2 different triangles. Take a photo of each.' },
    { id: 'i2-curvestraight', replaces: 'g2-06', type: 'photo', photos: 2, place: 'Curved and straight', icon: '〰️', ownSpot: true,
      at: 'Yellow slides', find: 'The yellow-slide structure', seen: 'video 082538 (wavy slide + straight double slide)',
      text: 'Find one curved slide and one straight slide. Take a photo of each.' },
    { id: 'i2-pendulum', replaces: 'g2-09', type: 'number', accept: [], place: 'Swing count', icon: '⏱️', ownSpot: true,
      at: 'Swings', find: 'The yellow A-frame swing set', seen: 'photo 082528',
      text: 'Push an empty swing one time. Count how many times it swings back to you. Type the number.' }
  ],
  '4': [
    { id: 'i4-rightangle', replaces: 'g4-07', type: 'photo', place: 'Right angle', icon: '📐', ownSpot: true,
      at: 'Yellow monkey bars', find: 'The yellow monkey bars', seen: 'photo 081906',
      text: 'Find a right angle (90°) where a post meets a bar on the yellow monkey bars. Take a photo.' },
    { id: 'i4-parallel', replaces: 'g4-09', type: 'photo', place: 'Parallel bars', icon: '🟰', ownSpot: true,
      at: 'Green horizontal bars', find: 'The green poles and bars', seen: 'photo 082044',
      text: 'Parallel lines stay the same distance apart and never meet. Find two parallel poles or bars and take a photo that shows it.' },
    { id: 'i4-fulcrum', replaces: 'g4-10', type: 'photo', place: 'Lever and fulcrum', icon: '⚖️', ownSpot: true,
      at: 'Green rocker', find: 'The green curved rocker with red handles', seen: 'photo 082010',
      text: 'The rocker is a lever. Take a photo of its fulcrum, the point it pivots on.' },
    { id: 'i4-symmetry', replaces: 'g4-03', type: 'photo', place: 'Line of symmetry', icon: '🪞', ownSpot: true,
      at: 'Blue double saucer swing', find: 'The blue double saucer swing set', seen: 'photo 081838 (two matching arches)',
      text: 'Stand in front of the blue double saucer swing. Take a photo straight on so the left half matches the right half (the line of symmetry is in the middle).' },
    { id: 'i4-axis', replaces: 'g4-10', type: 'photo', place: 'Axis of rotation', icon: '🔄', ownSpot: true,
      at: 'Yellow ring spinner', find: 'The yellow ring spinner on the green pole', seen: 'photo 082002',
      text: 'The yellow ring spins around an axis. Take a photo of the axis it turns on.' },
    { id: 'i4-dome', replaces: 'g4-06', type: 'photo', place: 'Dome shapes', icon: '🔺', ownSpot: true,
      at: 'Geodesic dome', find: 'The geodesic dome climber near the basketball hoops', seen: 'photo 081909',
      text: 'Triangles make a geodesic dome strong. Find a spot where 5 or 6 triangles meet at one point. Take a photo.' },
    { id: 'i4-perimeter', replaces: 'g4-09', type: 'number', accept: [], place: 'Perimeter', icon: '👣', ownSpot: true,
      at: 'Pavilion (Base Camp)', find: 'Base Camp: the brown metal pavilion', seen: 'photo 081930',
      text: 'Perimeter is the distance around a shape. Walk all the way around the pavilion’s concrete floor and count your steps. Type the number.' },
    { id: 'i4-spiral', replaces: 'g4-03', type: 'word', accept: ['spiral', 'straight'], place: 'Spiral or straight', icon: '🌀', ownSpot: true,
      at: 'Blue slides', find: 'The blue spiral slide and blue straight slide', seen: 'video 082202',
      text: 'Look at the blue spiral slide and the blue straight slide. Which one has the longer path? Type “spiral” or “straight”.' },
    { id: 'i4-gaga', replaces: 'g4-09', type: 'number', accept: [], place: 'Gaga pit polygon', icon: '🛑', ownSpot: true,
      at: 'Gaga pit', find: 'The black-walled gaga pit', seen: 'photo 081855',
      text: 'The gaga pit wall is a polygon. Count its sides. Type the number.' }
  ]
};
Object.keys(IDEAS).forEach(function (g) {
  IDEAS[g].forEach(function (d) { d.enabled = false; d.idea = true; window.STATION_SWAPS[g].push(d); });
});

/* RECOMMENDED set (Teacher mode > "Use the recommended set"): turns these on, on top of the defaults.
   1st: nothing extra now (Mr. Jeff's Nov 24 changes fill the weak spots; disc tower colors is still in the idea bank).  2nd: + disc tower pattern (replaces #1 Yellow slides).  4th: + line of symmetry (replaces #3 yellow panel). */
window.RECOMMENDED = { '1': [], '2': ['d2-discs'], '4': ['i4-symmetry'] };
window.DRAG_OPTIONS = window.STATION_SWAPS;   // older name
