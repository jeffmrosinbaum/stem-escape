/* ===== STEM Lab Escape Challenge: settings Mr. Jeff can change =====
   Most of these can also be changed on one iPad in Teacher mode (open the site with ?teacher=1,
   or press and hold the title for 2 seconds). Teacher-mode changes only affect that iPad. */
window.APP_CONFIG = {
  /* Where finished records are emailed. The Apps Script has its own allow-list too (apps-script/Code.gs). */
  TEACHER_EMAIL: 'jrosinbaum@bentonschools.org',

  /* Paste the Apps Script "Web app" URL here (ends in /exec). Leave '' and nothing is sent:
     records wait on the iPad and can be downloaded or shared from the finish screen or Teacher mode. */
  SUBMIT_ENDPOINT: '',

  /* The site's public address (GitHub Pages), used for the start QR codes. */
  APP_URL: 'https://jeffmrosinbaum.github.io/stem-escape/',

  /* Group numbers are automatic: the Apps Script above also hands out Group 1, 2, 3... per grade per day.
     Route = group number (12 routes; Group 13 -> Route 1). How long to wait for the counter before using
     this iPad's fallback number (milliseconds). */
  COUNTER_TIMEOUT_MS: 4000,

  /* Show a faint copy of the picture under the puzzle grid as a helper. */
  PUZZLE_GHOST: true,

  /* Wrong tries on a typed answer before the "Ask a grown-up" hint shows. */
  HINT_AFTER_TRIES: 2,

  SIGNATURE: 'Mr. Jeff, STEM Lab'
};
