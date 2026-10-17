/* Run whatever the current page contains. Each init is a no-op when its elements are absent. */
(function (PM) {
  'use strict';
  PM.initSite();
  PM.initAdoption();
  PM.initMonthly();
  PM.initChapters();
  PM.initTiles();
  PM.initTargets();
  PM.initTimeline();
  PM.initArchive();
  PM.startCharts();
})(window.PM);
